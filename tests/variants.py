"""Nine alternate implementations per exercise. The tenth is its editable catalog example."""
from textwrap import dedent, indent

BODIES={
"count-positives":[
"""n = 0
for x in values:
    n += x > 0
return n""",
"""n = 0
for x in reversed(values):
    if x <= 0:
        continue
    n += 1
return n""",
"""flags = []
for x in values:
    flags.append(x > 0)
return sum(flags)""",
"""n = len(values)
for x in values:
    if x <= 0:
        n -= 1
return n""",
"""i = 0
n = 0
while i < len(values):
    if values[i] >= 1:
        n += 1
    i += 1
return n""",
"""positive = []
for x in values:
    if x > 0:
        positive.append(x)
return len(positive)""",
"""if not values:
    return 0
return (values[0] > 0) + count_positives(values[1:])""",
"""n = 0
for i in range(len(values)):
    n = n + (1 if values[i] > 0 else 0)
return n""",
"""ordered = sorted(values)
for i, x in enumerate(ordered):
    if x > 0:
        return len(values) - i
return 0""",
],
"clamp":[
"return max(low, min(high, value))",
"return min(high, max(low, value))",
"""if value >= high:
    return high
if value <= low:
    return low
return value""",
"""result = value
if result < low:
    result = low
if result > high:
    result = high
return result""",
"return low if value <= low else high if value >= high else value",
"return sorted([value, low, high])[1]",
"""if low <= value <= high:
    return value
return low if value < low else high""",
"return low + min(max(value - low, 0), high - low)",
"""if value - high > 0:
    return high
return max(value, low)""",
],
"first-match":[
"return values.index(target) if target in values else -1",
"""for i, value in enumerate(values):
    if value == target:
        return i
return -1""",
"""i = 0
while i < len(values) and values[i] != target:
    i += 1
return -1 if i == len(values) else i""",
"""idx = -1
for i in reversed(range(len(values))):
    if values[i] == target:
        idx = i
return idx""",
"""hits = []
for i in range(len(values)):
    if target == values[i]:
        hits.append(i)
return min(hits) if hits else -1""",
"""if not values:
    return -1
if target == values[0]:
    return 0
tail = first_match(values[1:], target)
return tail + 1 if tail >= 0 else -1""",
"""count = 0
for value in values:
    if target == value:
        break
    count += 1
return count if count < len(values) else -1""",
"""if target not in values:
    return -1
i = len(values) - 1
while target in values[:i]:
    i -= 1
return i""",
"""for i in range(1, len(values) + 1):
    if values[i - 1] == target:
        return i - 1
return -1""",
],
"running-total":[
"""result = []
for i in range(len(values)):
    result.append(sum(values[:i + 1]))
return result""",
"""out = [0]
for n in values:
    out.append(out[-1] + n)
return out[1:]""",
"""out = values[:]
for i in range(1, len(out)):
    out[i] = out[i] + out[i - 1]
return out""",
"""if not values:
    return []
return running_total(values[:-1]) + [sum(values)]""",
"""n = 0
out = []
i = 0
while i < len(values):
    n = n + values[i]
    out.append(n)
    i += 1
return out""",
"""out = []
for i, n in enumerate(values):
    out.append(n + sum(values[:i]))
return out""",
"""left = sum(values)
out = []
for n in reversed(values):
    out.append(left)
    left -= n
return out[::-1]""",
"""result = []
for n in values:
    if result:
        result.append(result[-1] + n)
    else:
        result.append(n)
return result""",
"""n = 0
out = []
for x in values:
    n += x
    out += [n]
return out""",
],
"palindrome":[
"return text == text[::-1]",
"""left = 0
right = len(text) - 1
while left < right:
    if text[left] != text[right]:
        return False
    left += 1
    right -= 1
return True""",
"""if len(text) <= 1:
    return True
return text[0] == text[-1] and palindrome(text[1:-1])""",
"""back = ''
for ch in text:
    back = ch + back
return back == text""",
"""mismatch = 0
for i, ch in enumerate(text):
    mismatch += ch != text[-1-i]
return mismatch == 0""",
"""matches = []
for left, right in zip(text, reversed(text)):
    matches.append(left == right)
return all(matches)""",
"""n = len(text)
left = text[:n // 2]
right = text[(n + 1) // 2:]
return left == right[::-1]""",
"""out = True
for i in range(len(text)):
    out = out and text[i] == text[len(text) - i - 1]
return out""",
"""s = text
while len(s) > 1:
    if s[-1] != s[0]:
        return False
    s = s[1:-1]
return True""",
],
"binary-search":[
"""lo = 0
hi = len(values)
while lo < hi:
    mid = (lo + hi) // 2
    if values[mid] < target:
        lo = mid + 1
    else:
        hi = mid
return lo if lo < len(values) and values[lo] == target else -1""",
"""left = 0
right = len(values)
while left < right:
    mid = left + (right - left) // 2
    if values[mid] > target:
        right = mid
    elif values[mid] < target:
        left = mid + 1
    else:
        return mid
return -1""",
"""if not values:
    return -1
i = len(values) // 2
if values[i] == target:
    return i
if values[i] > target:
    return binary_search(values[:i], target)
rest = binary_search(values[i+1:], target)
return -1 if rest < 0 else i + 1 + rest""",
"""left = -1
right = len(values)
while right - left > 1:
    middle = (left + right) // 2
    if values[middle] <= target:
        left = middle
    else:
        right = middle
return left if left >= 0 and values[left] == target else -1""",
"""lo = 0
hi = len(values) - 1
while hi >= lo:
    m = (lo + hi + 1) // 2
    if target < values[m]:
        hi = m - 1
    elif target > values[m]:
        lo = m + 1
    else:
        return m
return -1""",
"""i = 0
size = len(values)
while size:
    step = size // 2
    mid = i + step
    if values[mid] < target:
        i = mid + 1
        size -= step + 1
    else:
        size = step
return i if i < len(values) and target == values[i] else -1""",
"""offset = 0
region = values
while region:
    mid = len(region) // 2
    if region[mid] == target:
        return offset + mid
    if target < region[mid]:
        region = region[:mid]
    else:
        offset += mid + 1
        region = region[mid + 1:]
return -1""",
"""if not values or target < values[0] or target > values[-1]:
    return -1
lo = 0
hi = len(values) - 1
while lo + 1 < hi:
    m = (lo + hi) // 2
    if values[m] > target:
        hi = m
    else:
        lo = m
if values[lo] == target:
    return lo
return hi if values[hi] == target else -1""",
"""a = 0
b = len(values)
while b > a:
    i = (a + b) // 2
    diff = values[i] - target
    if diff == 0:
        return i
    if diff > 0:
        b = i
    else:
        a = i + 1
return -1""",
]}

def solutions(problem):
    yield problem["starter"]
    signature=problem["starter"].splitlines()[0]
    for body in BODIES[problem["id"]]:
        yield signature+"\n"+indent(dedent(body),"    ")
