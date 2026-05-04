import requests
import json

def test_ollama():
    url = "http://192.168.50.83:11434/api/tags"
    print(f"Intentant connectar a Ollama a: {url}...")
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print("SUCCÈS! El servidor d'Ollama respon correctament.")
            models = response.json().get('models', [])
            print(f"Models disponibles: {[m['name'] for m in models]}")
        else:
            print(f"Error: El servidor ha respost amb el codi {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("ERROR: No s'ha pogut establir la connexió. Revisa si l'Ollama està actiu i permet connexions externes (OLLAMA_HOST=0.0.0.0).")
    except Exception as e:
        print(f"Error inesperat: {e}")

if __name__ == "__main__":
    test_ollama()
