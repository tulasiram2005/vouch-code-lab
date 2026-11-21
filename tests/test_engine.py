import ast
import json
import sys
import unittest
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1] / "public"
sys.path.insert(0, str(PUBLIC))
import engine

PROBLEMS = json.loads((PUBLIC / "problems.json").read_text())

class EngineTests(unittest.TestCase):
    def run_code(self, code, problem=None, mode="round", seed=42):
        return engine.practice(dict(code=code, problem=problem or PROBLEMS[0], mode=mode, seed=seed))

    def test_catalog_rounds_replay_and_validate_against_python(self):
        for p in PROBLEMS:
            for seed in range(10):
                with self.subTest(problem=p["id"],seed=seed):
                    result=self.run_code(p["starter"], p, seed=seed)
                    self.assertEqual(result,self.run_code(p["starter"], p, seed=seed))
                    self.assertTrue(all(t["passed"] for t in result["tests"]))
                    self.assertEqual(5,len(result["probes"]))
                    original=engine.compile_fn(engine.parse(p["starter"],p["functionName"]),p["functionName"])
                    for q in result["probes"]:
                        answer=q["options"][q["correctIndex"]]
                        self.assertEqual(4,len(set(q["options"])))
                        mutant=engine.compile_fn(engine.parse(q["code"],p["functionName"]),p["functionName"])
                        def args(call):
                            return [ast.literal_eval(n) for n in ast.parse(call,mode="eval").body.args]
                        if q["kind"]=="Breaker":
                            changed=[option for option in q["options"] if not engine.same(
                                engine.invoke(mutant,args(option)),engine.invoke(original,args(option)))]
                            self.assertEqual([answer],changed)
                        else:
                            call=q["prompt"][len("What does "):-len(" return or raise?")]
                            self.assertEqual(answer,engine.label(engine.invoke(mutant,args(call))))
                            self.assertFalse(engine.same(engine.invoke(mutant,args(call)),engine.invoke(original,args(call))))

    def test_bad_code(self):
        for code in ("","def another(): pass","def broken(","pass\n"*201,
                     "import os", "def count_positives(values=[]): return 1",
                     "def count_positives(values): return values.__class__",
                     "def count_positives(values): return [x for x in values]",
                     "def count_positives(values): return open('file')"):
            with self.subTest(source=code),self.assertRaises(engine.PracticeError):
                self.run_code(code)

    def test_budget(self):
        for body in ("while True: pass", "return 'a' * 1000000", "return range(9999999)"):
            with self.subTest(body=body),self.assertRaises(engine.PracticeError):
                self.run_code("def count_positives(values):\n    "+body)

    def test_failed_tests_skip_questions(self):
        result=self.run_code("def count_positives(values): return 0")
        self.assertFalse(all(t["passed"] for t in result["tests"]))
        self.assertFalse(result["probes"])

    def test_independent_mutable_inputs(self):
        p=PROBLEMS[0]
        previous=json.dumps(p)
        self.run_code("def count_positives(values):\n    values.append(0)\n    return 1",p)
        self.assertEqual(previous,json.dumps(p))

    def test_tolerance_and_types(self):
        self.assertTrue(engine.same(("value",0.1+0.2),("value",0.3)))
        for value,other in ((True,1),(False,0),([1],(1,)),(["x"],["y"])):
            self.assertFalse(engine.same(("value",value),("value",other)))

    def test_syntax_line_and_early_return(self):
        with self.assertRaisesRegex(engine.PracticeError,"Line 2"):
            self.run_code("def count_positives(values):\n  if")
        r=self.run_code("def count_positives(values): return len(values)")
        self.assertEqual([],r["probes"])

    def test_augmented_addition_preserves_list_alias(self):
        tree=engine.parse("def fn(values):\n    alias = values\n    values += [3]\n    return alias","fn")
        self.assertEqual(("value",[1,3]), engine.invoke(engine.compile_fn(tree,"fn"),[[1]]))

    def test_print_feedback(self):
        result=self.run_code("def count_positives(values):\n    print(values)\n    return 0")
        self.assertIn("Printed text",result["message"])
