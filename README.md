# ivs-viewer-count

## Deploy

```bash
cd src
npm install
npm run build
cd ..
sam build -u
sam deploy --guided
```
## Cleanup

```bash
aws cloudformation delete-stack --stack-name STACK_NAME
```
