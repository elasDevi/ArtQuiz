"""Read domain/password/key from NUL-delimited stdin; never log credential values."""
import json
import sys

values = sys.stdin.buffer.read().decode('utf-8').split('\0')
if len(values) != 4 or values[-1] != '':
    raise SystemExit('Invalid configuration input')
domain, password, key, _ = values
if any(c in domain for c in '\r\n\0'):
    raise SystemExit('Invalid hostname')

def quoted(value):
    # Compose interpolates $ even inside double quotes. $$ preserves a literal $.
    return json.dumps(value, ensure_ascii=False).replace('$', '$$')

print('PRADO_DOMAIN=' + domain)
print('ADMIN_PASSWORD=' + quoted(password))
print('AI_PROVIDER=gemini')
print('GEMINI_API_KEY=' + quoted(key))
