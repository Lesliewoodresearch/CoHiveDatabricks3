import json
import os
import requests

def handler(request):
    if request.method != "POST":
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }

    try:
        body = request.json()
        file_name = body.get("fileName")
        file_content_base64 = body.get("fileContentBase64")

        databricks_token = os.environ.get("DATABRICKS_TOKEN")

        url = "https://dbc-1b7ba151-05e9.cloud.databricks.com/api/2.0/dbfs/put"

        payload = {
            "path": f"/FileStore/uploads/{file_name}",
            "contents": file_content_base64,
            "overwrite": True
        }

        headers = {
            "Authorization": f"Bearer {databricks_token}",
            "Content-Type": "application/json"
        }

        response = requests.post(url, headers=headers, json=payload)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "success": True,
                "databricks_response": response.json()
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
