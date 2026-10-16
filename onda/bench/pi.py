n = 20000000; s = 0.0
for i in range(n):
    x = (i + 0.5) / n; s += 4.0 / (1.0 + x * x)
print(s / n)
