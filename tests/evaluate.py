"""Run the six-by-ten implementation evaluation on this host."""
import json
import statistics
import sys
import time
from pathlib import Path
from variants import solutions

PUBLIC=Path(__file__).resolve().parents[1]/"public"
sys.path.insert(0,str(PUBLIC))
import engine

def main():
    data=[]
    for problem in json.loads((PUBLIC / "problems.json").read_text()):
        for variant,source in enumerate(solutions(problem)):
            item=dict(code=source,mode="round",problem=problem,seed=42)
            start=time.perf_counter()
            result=engine.practice(item)
            elapsed=(time.perf_counter()-start)*1000
            expected=problem["tests"]+problem["cases"]
            func=engine.compile_fn(engine.parse(source,problem["functionName"]),problem["functionName"])
            assert all(engine.same(engine.invoke(func,c["args"]),("value",c["expected"])) for c in expected), (problem["id"],variant)
            data.append(dict(problem=problem["id"],variant=variant,probes=len(result["probes"]),ms=elapsed,**result["metrics"]))
    times=sorted(row["ms"] for row in data)
    print("implementations",len(data),"probes",sum(row["probes"] for row in data),"full rounds",sum(row["probes"]==5 for row in data))
    print("Python warm generation p50/p95 (ms)",round(statistics.median(times),2),round(times[56],2))
    for key in ("evaluated","equivalentOnPool","nonEquivalent","discarded"):
        print(key,sum(row[key] for row in data))
    for p in dict.fromkeys(row["problem"] for row in data):
        rows=[x for x in data if x["problem"]==p]
        print(p,[x["probes"] for x in rows])

if __name__=="__main__":
    main()
