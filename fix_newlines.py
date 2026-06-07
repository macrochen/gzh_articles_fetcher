import re

with open('/Users/shi/workspace/gzh_articles_fetcher/options/options.js', 'r') as f:
    content = f.read()

content = content.replace("const delimiter = '\n--' + boundary + '\n';", "const delimiter = '\\r\\n--' + boundary + '\\r\\n';")
content = content.replace("const closeDelimiter = '\n--' + boundary + '--';", "const closeDelimiter = '\\r\\n--' + boundary + '--';")
content = content.replace("'Content-Type: application/json; charset=UTF-8\n\n',", "'Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n',")

with open('/Users/shi/workspace/gzh_articles_fetcher/options/options.js', 'w') as f:
    f.write(content)
