from uuid import uuid4

from app.community_worker import run_once
from tests.test_api import create
from tests.test_community import prediction


def published(client, account):
    create(client, account)
    assert run_once()
    posts = client.get("/api/v1/community/feed", headers=account["headers"]).json()["data"]["posts"]
    return "/api/v1/community/posts/" + posts[0]["id"]


def add(client, path, headers, text="Comment", parent=None, request_id=None):
    return client.post(
        path + "/comments",
        headers=headers,
        json={
            "body": text,
            "request_id": request_id or str(uuid4()),
            "parent_id": parent,
        },
    )


def test_reply_validation_idempotency_and_cascade(client, accounts, monkeypatch):
    prediction(monkeypatch)
    owner, other = accounts["owner"]["headers"], accounts["other"]["headers"]
    path = published(client, accounts["owner"])
    root = add(client, path, owner).json()["data"]["id"]
    key = str(uuid4())
    r = add(client, path, other, "Reply", root, key)
    assert r.status_code == 201, r.text
    child = r.json()["data"]["id"]
    assert add(client, path, other, "Reply", root, key).json()["data"]["id"] == child
    assert add(client, path, other, "Reply", None, key).status_code == 409
    assert add(client, path, other, "Nested", child).status_code == 422
    assert add(client, path, other, "Missing", str(uuid4())).status_code == 404
    assert add(client, path, other, " ", root).status_code == 422
    roots = client.get(path + "/comments").json()["data"]["comments"]
    assert len(roots) == 1 and roots[0]["parent_id"] is None and roots[0]["reply_count"] == 1
    replies = client.get(path + "/comments?parent_id=" + root).json()["data"]["comments"]
    assert len(replies) == 1 and replies[0]["parent_id"] == root
    path2 = published(client, accounts["other"])
    assert add(client, path2, other, "Wrong post", root).status_code == 404
    assert client.delete("/api/v1/community/comments/" + child, headers=owner).status_code == 403
    assert client.delete("/api/v1/community/comments/" + root, headers=owner).status_code == 200
    assert client.get(path + "/comments").json()["data"]["comments"] == []
    assert client.get(path + "/comments?parent_id=" + root).status_code == 404
    assert client.get(path).json()["data"]["comment_count"] == 0
    assert add(client, path, other, "Deleted root", root).status_code == 404


def test_reply_pagination_and_withdrawal(client, accounts, monkeypatch):
    prediction(monkeypatch)
    monkeypatch.setattr("app.community.limit", lambda *a, **kw: None)
    owner = accounts["owner"]["headers"]
    path = published(client, accounts["owner"])
    root = add(client, path, owner).json()["data"]["id"]
    ids = set()
    for i in range(32):
        r = add(client, path, owner, f"Reply {i}", root)
        assert r.status_code == 201
        ids.add(r.json()["data"]["id"])
    first = client.get(path + "/comments?parent_id=" + root).json()["data"]
    assert len(first["comments"]) == 30 and first["next_cursor"]
    second = client.get(
        path + "/comments", params={"parent_id": root, "cursor": first["next_cursor"]}
    ).json()["data"]
    assert len(second["comments"]) == 2 and second["next_cursor"] is None
    assert {c["id"] for c in first["comments"] + second["comments"]} == ids
    child = second["comments"][0]["id"]
    assert client.delete("/api/v1/community/comments/" + child, headers=owner).status_code == 200
    assert client.get(path + "/comments").json()["data"]["comments"][0]["reply_count"] == 31
    assert client.delete(path, headers=owner).status_code == 200
    assert add(client, path, owner, "Withdrawn", root).status_code == 409
