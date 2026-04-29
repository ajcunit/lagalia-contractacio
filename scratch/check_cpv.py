import sqlite3
import os

db_path = 'backend/database.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Distinct levels:")
cursor.execute("SELECT DISTINCT nivel FROM cpvs")
levels = cursor.fetchall()
for level in levels:
    print(f" - {level[0]}")

cursor.execute("SELECT count(*) FROM cpvs")
count = cursor.fetchone()[0]
print(f"Total CPVs: {count}")

if count > 0:
    print("\nSample records:")
    cursor.execute("SELECT codigo, descripcion, nivel, padre_codigo FROM cpvs LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(row)

conn.close()
