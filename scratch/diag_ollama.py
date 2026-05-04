import httpx
import sys

def test():
    ips = ['192.168.80.80', '192.168.50.83']
    for ip in ips:
        url = f"http://{ip}:11434/api/tags"
        print(f"--- Provant {url} ---")
        try:
            r = httpx.get(url, timeout=3.0)
            if r.status_code == 200:
                data = r.json()
                models = [m['name'] for m in data.get('models', [])]
                print(f"SUCCÈS! Connexió establerta.")
                print(f"Models disponibles: {models}")
            else:
                print(f"ERROR: Codi de resposta {r.status_code}")
        except Exception as e:
            print(f"FALLA: No s'ha pogut connectar a {ip}. Error: {e}")
        print("-" * 30)

if __name__ == "__main__":
    test()
