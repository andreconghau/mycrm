---
id: 15a72bbe-d874-4aaa-9bf3-3018e2994f02
order: 3048
---
# Start app develop
```javascript
npm run dev -- --hostname 127.0.0.1
```

# Tạo user bằng CLI
```javascript
npm run access:operator -- bootstrap-admin \
  --email admin@layeuviet.com \
  --display-name "CRM Admin"
  
 // ZO1cFNh7cyprj03I
  
  npm run access:operator -- bootstrap-admin \
  --email admin@layeuviet.com \
  --display-name "CRM Admin"
  
```
---
# DB migrate
```javascript
npm run db:migrate
```

# Scan folders
```javascript
tree . -L 2 -I 'node_modules'
```



---
# Trackers exports
```javascript
npm run tracker:backup -- --stdin
```
```javascript
find nimbalyst-local/tracker/tasks -maxdepth 1 -type f -name 'tsk_*.md' | sort

```




