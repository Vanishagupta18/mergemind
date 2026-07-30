from fastapi import FastAPI, Request
import json
from worker import process_pr

app = FastAPI()

@app.post('/webhook')
async def receive_webhook(request: Request):
    body = await request.body()
    data = json.loads(body)
    action = data.get('action')
    print(f"ACTION RECEIVED: {action}")

    if action in ['opened', 'synchronize', 'reopened']:
        pr = data['pull_request']
        repo = data['repository']['full_name']
        process_pr.delay(repo, pr['number'], pr['title'])
        print(f"Queued PR #{pr['number']} for review (action: {action})")

    return {'status': 'received'}

@app.get('/')
def health_check():
    return {'status': 'server is alive'}