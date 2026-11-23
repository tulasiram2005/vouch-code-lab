"""Deterministic comprehension probes for a bounded subset of Python."""
import ast
import builtins
import copy
import json
import math
import operator
import random
import sys
import time

class PracticeError(ValueError):
    pass

class BudgetExceeded(PracticeError):
    pass

def bounded_range(*args):
    result = range(*args)
    if len(result) > 1024:
        raise BudgetExceeded("Use a range of at most 1,024 values.")
    return result

SAFE = {k: getattr(builtins, k) for k in (
    "abs all any bool enumerate len max min reversed sorted sum zip".split()
)}
SAFE.update(range=bounded_range, print=lambda *args: None)
METHODS = {"append", "pop", "count", "index", "lower", "upper"}
ALLOWED = set("""
Module FunctionDef arguments arg Return Assign AugAssign For While If Expr Pass Break Continue
Name Constant List Tuple Subscript Slice Attribute Call BinOp BoolOp Compare UnaryOp IfExp
Load Store Add Sub Mult FloorDiv Mod And Or Not UAdd USub Eq NotEq Lt LtE Gt GtE In NotIn
""".split())

def parse(code, name):
    if not isinstance(code, str) or not code.strip():
        raise PracticeError("Enter a Python function first.")
    if len(code) > 12000 or len(code.splitlines()) > 200:
        raise PracticeError("Keep the function under 12,000 characters and 201 lines.")
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise PracticeError(f"Line {e.lineno}: {e.msg}") from None
    if len(tree.body) != 1 or not isinstance(tree.body[0], ast.FunctionDef) or tree.body[0].name != name:
        raise PracticeError(f"Define exactly one function named {name}.")
    fn = tree.body[0]
    if (fn.decorator_list or fn.returns or fn.args.defaults or fn.args.kwonlyargs or
        fn.args.vararg or fn.args.kwarg or any(a.annotation for a in fn.args.args + fn.args.posonlyargs)):
        raise PracticeError("Use plain positional arguments without defaults, annotations or decorators.")
    for n in ast.walk(tree):
        if type(n).__name__ not in ALLOWED or (isinstance(n, ast.FunctionDef) and n is not fn):
            raise PracticeError(f"Line {getattr(n,'lineno',1)}: {type(n).__name__} is outside the practice subset.")
        if isinstance(n, (ast.Name, ast.arg)):
            var = n.id if isinstance(n, ast.Name) else n.arg
            if var.startswith("_") or var in ("open","eval","exec","getattr","globals","input"):
                raise PracticeError(f"Name {var!r} is unavailable in practice.")
        if isinstance(n, ast.Attribute) and n.attr not in METHODS:
            raise PracticeError(f"Method {n.attr!r} is unavailable in practice.")
        if isinstance(n, ast.Constant):
            v=n.value
            if type(v) not in (str,int,float,bool,type(None)) or (type(v)==str and len(v)>256) or (type(v)==int and v.bit_length()>128):
                raise PracticeError("Use short strings and small numeric constants.")
        if isinstance(n, ast.Call) and not (
            isinstance(n.func, ast.Name) and n.func.id in SAFE.keys() | {name}
            or isinstance(n.func, ast.Attribute) and n.func.attr in METHODS):
            raise PracticeError("Call a supported built-in, method, or the practice function.")
    return ast.parse(ast.unparse(tree))

def small(value, depth=0, budget=None):
    if budget is None:
        budget=[512]
    budget[0] -= 1
    if budget[0]<0 or depth>12:
        raise BudgetExceeded("Output or intermediate value is too large.")
    if isinstance(value,(list,tuple)):
        if len(value)>512:
            raise BudgetExceeded("Collection exceeds 512 elements.")
        for item in value:
            small(item, depth+1, budget)
    elif isinstance(value,str) and len(value)>1024 or type(value)==int and value.bit_length()>256:
        raise BudgetExceeded("Value exceeds the practice size limit.")
    return value

def guarded(op,a,b):
    if op in ("Mult","IMult"):
        if isinstance(a,(str,list,tuple)) and isinstance(b,int) and len(a)*b>512 or isinstance(b,(str,list,tuple)) and isinstance(a,int) and len(b)*a>512:
            raise BudgetExceeded("Repeated sequence exceeds the practice limit.")
        return small(operator.imul(a,b) if op=="IMult" else a*b)
    if op in ("Add","IAdd"):
        return small(operator.iadd(a,b) if op=="IAdd" else a+b)
    if op=="Mod":
        if isinstance(a,str):
            raise PracticeError("String formatting is unavailable.")
        return a % b
    raise AssertionError(op)

class Guards(ast.NodeTransformer):
    def visit_BinOp(self,node):
        self.generic_visit(node)
        op=type(node.op).__name__
        if op in ("Mult","Add","Mod"):
            return ast.copy_location(ast.Call(ast.Name("_guard",ast.Load()),[ast.Constant(op),node.left,node.right],[]),node)
        return node
    def visit_AugAssign(self,node):
        if type(node.op).__name__ in ("Mult","Mod","Add"):
            if not isinstance(node.target,ast.Name):
                raise PracticeError("Use a named variable for augmented arithmetic.")
            value = ast.Name(node.target.id,ast.Load())
            op = type(node.op).__name__
            name = "I" + op if op in ("Add","Mult") else op
            call = ast.Call(ast.Name("_guard",ast.Load()),[ast.Constant(name),value,self.visit(node.value)],[])
            return ast.copy_location(ast.Assign([node.target],call),node)
        return self.generic_visit(node)

def compile_fn(tree,name):
    env={"__builtins__": SAFE, "_guard":guarded}
    guarded_tree=Guards().visit(copy.deepcopy(tree))
    exec(compile(ast.fix_missing_locations(guarded_tree), "<practice>", "exec"),env)
    return env[name]

def invoke(fn,args):
    remaining=1400
    deadline=time.monotonic()+0.3
    def trace(frame,event,arg):
        nonlocal remaining
        if frame.f_code.co_filename != "<practice>":
            return None
        remaining -= 1
        if remaining <= 0 or time.monotonic()>deadline:
            raise BudgetExceeded("Execution limit reached. Check loop bounds and recursion.")
        return trace
    try:
        sys.settrace(trace)
        value=small(fn(*copy.deepcopy(args)))
        if type(value) not in (list,tuple,int,float,bool,str,type(None)):
            raise PracticeError("Return a number, boolean, string, tuple or list.")
        json.dumps(value,allow_nan=False)
        return ("value",value)
    except (PracticeError, MemoryError):
        raise
    except Exception as e:
        return ("error",type(e).__name__)
    finally:
        sys.settrace(None)

def same(a,b):
    if a[0]!=b[0]: return False
    def equal(x,y):
        if type(x) in (float,int) and type(y) in (float,int):
            return math.isclose(x,y,rel_tol=1e-9,abs_tol=1e-9)
        if type(x)!=type(y): return False
        if isinstance(x,(list,tuple)):
            return len(x)==len(y) and all(equal(u,v) for u,v in zip(x,y))
        return x==y
    return equal(a[1],b[1])

def label(result):
    return repr(result[1]) if result[0]=="value" else f"raises {result[1]}"

SWAPS = {ast.Eq: ast.NotEq, ast.NotEq: ast.Eq, ast.Lt:ast.LtE, ast.LtE:ast.Lt,
         ast.Gt:ast.GtE, ast.GtE:ast.Gt, ast.And:ast.Or, ast.Or:ast.And,
         ast.Add:ast.Sub, ast.Sub:ast.Add, ast.Mult:ast.FloorDiv, ast.FloorDiv:ast.Mult}

def replacements(node):
    if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in ("min","max"):
        n=copy.deepcopy(node)
        n.func.id="max" if node.func.id=="min" else "min"
        yield n
    if isinstance(node, (ast.If,ast.IfExp)):
        n=copy.deepcopy(node)
        n.test=ast.UnaryOp(ast.Not(), n.test)
        yield n
    if isinstance(node,ast.Compare):
        for i,op in enumerate(node.ops):
            if type(op) in SWAPS:
                n=copy.deepcopy(node); n.ops[i]=SWAPS[type(op)](); yield n
    if isinstance(node,(ast.BinOp,ast.AugAssign,ast.BoolOp)) and type(node.op) in SWAPS:
        n=copy.deepcopy(node); n.op=SWAPS[type(node.op)](); yield n
    if isinstance(node,ast.BinOp) and isinstance(node.op,(ast.Sub,ast.FloorDiv,ast.Mod)):
        n=copy.deepcopy(node); n.left,n.right=n.right,n.left; yield n
    if isinstance(node,ast.Constant) and type(node.value)==int:
        for delta in [-1,1]: yield ast.Constant(node.value+delta)
    if isinstance(node,ast.Constant) and type(node.value)==bool:
        yield ast.Constant(not node.value)
    if isinstance(node,(ast.Break,ast.Continue)): yield ast.Pass()
    if isinstance(node,ast.Return) and node.value:
        for val in (0,1,-1,None): yield ast.Return(ast.Constant(val))
    if isinstance(node,ast.Call) and isinstance(node.func,ast.Name) and node.func.id in ("len","range") and len(node.args)==1:
        if node.func.id=="range":
            yield ast.Call(node.func,[ast.BinOp(node.args[0],ast.Sub(),ast.Constant(1))],[])
        else:
            yield ast.BinOp(node,ast.Sub(),ast.Constant(1))
    if isinstance(node,ast.Slice) and node.upper:
        yield ast.Slice(node.lower,ast.BinOp(node.upper,ast.Sub(),ast.Constant(1)),node.step)

def variants(tree,rng):
    sites=[]
    for node in ast.walk(tree):
        for key,item in ast.iter_fields(node):
            children=enumerate(item) if isinstance(item,list) else [(None,item)]
            for index,child in children:
                if isinstance(child,ast.AST):
                    for replacement in replacements(child):
                        sites.append((node,key,index,child,replacement))
    rng.shuffle(sites)
    seen={ast.unparse(tree)}
    for parent,key,index,old,new in sites[:40]:
        def assign(value):
            if index is None: setattr(parent,key,value)
            else: getattr(parent,key)[index]=value
        assign(ast.copy_location(new,old))
        try:
            source=ast.unparse(tree)
            if source not in seen:
                seen.add(source)
                yield source,old.lineno
        finally:
            assign(old)

def make_probes(tree,fn,problem,rng):
    tests=problem["tests"]+problem.get("cases",[])
    pool=[t["args"] for t in tests[:12]]
    baseline=[invoke(fn,args) for args in pool]
    probes=[]
    used_questions=set()
    metrics=dict(evaluated=0,equivalentOnPool=0,nonEquivalent=0,discarded=0)
    for source,line in variants(tree,rng):
        metrics["evaluated"]+=1
        candidate=compile_fn(ast.parse(source),problem["functionName"])
        try:
            outcomes=[invoke(candidate,args) for args in pool]
        except (BudgetExceeded,PracticeError,RecursionError):
            metrics["discarded"]+=1
            continue
        if all(x[0]=="error" for x in outcomes):
            metrics["discarded"]+=1
            continue
        diff=[i for i,pair in enumerate(zip(outcomes,baseline)) if not same(*pair)]
        equal=[i for i in range(len(pool)) if i not in diff]
        if not diff:
            metrics["equivalentOnPool"]+=1
            continue
        metrics["nonEquivalent"]+=1
        kind="Breaker" if len(probes)%2==1 and len(equal)>=3 else "Predict"
        idx=rng.choice(diff)
        def call(i):
            return problem["functionName"]+"("+", ".join(repr(x) for x in pool[i])+")"
        if kind=="Breaker":
            answer=call(idx)
            options=[answer]+[call(i) for i in rng.sample(equal,3)]
            prompt="Which input exposes the change?"
        else:
            answer=label(outcomes[idx])
            alternatives=list(dict.fromkeys(
                [label(baseline[idx])] + [label(x) for x in outcomes+baseline] +
                ["None","0","1","-1","raises IndexError","[]"]))
            alternatives=[x for x in alternatives if x!=answer]
            options=[answer]+alternatives[:3]
            prompt=f"What does {call(idx)} return or raise?"
        if len(set(options))!=4: continue
        signature=(source,prompt)
        if signature in used_questions: continue
        used_questions.add(signature)
        rng.shuffle(options)
        probes.append(dict(kind=kind,code=source,line=line,prompt=prompt,
            options=options,correctIndex=options.index(answer),
            explanation=f"For {call(idx)}, the original gives {label(baseline[idx])}. The highlighted version gives {label(outcomes[idx])}."))
        if len(probes)==5: break
    return probes,metrics

def practice(request):
    problem=request["problem"]; name=problem["functionName"]
    tree=parse(request["code"],name); fn=compile_fn(tree,name)
    results=[]
    for t in problem["tests"]:
        actual=invoke(fn,t["args"])
        results.append(dict(**t,actual=actual[1] if actual[0]=="value" else label(actual),
            passed=same(actual,("value",t["expected"]))))
    probes=[]
    metrics={}
    message="Printed text is ignored. Test results use the return value." if any(
        isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "print"
        for n in ast.walk(tree)) else ""
    if all(x["passed"] for x in results) and request["mode"]=="round":
        probes,metrics=make_probes(tree,fn,problem,random.Random(request.get("seed",42)))
        if len(probes)<5:
            message=f"Your implementation produced {len(probes)} distinct questions on this input set."
    return dict(tests=results,probes=probes,message=message,metrics=metrics)
