import os, glob

for filepath in glob.glob('app/models/*.py'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if 'server_default=text("gen_random_uuid()")' in content:
        if 'import uuid' not in content:
            content = 'import uuid\n' + content
        content = content.replace('server_default=text("gen_random_uuid()")', 'default=uuid.uuid4')
        with open(filepath, 'w') as f:
            f.write(content)
