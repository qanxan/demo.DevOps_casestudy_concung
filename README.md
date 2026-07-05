# Con Cung – DevOps Case Study

Repo demo cho bài case study vị trí **DevOps Engineer**. Bao gồm:

| Thành phần | Mô tả | Task |
|---|---|---|
| `app/` | Demo web app Node.js (Express) có health probe cho Kubernetes | – |
| `docker-compose.yml` | Chạy local: Jenkins + agent + app | – |
| `Jenkinsfile` | Pipeline CI/CD multi-stage, có parallel + rollback | Task 1 |
| `k8s/` | Deployment, Service, Ingress, ConfigMap, HPA | **Task 0 (bắt buộc)** |
| `docs/` | Report + slide deck | – |

Các task đã làm: **Task 0 (bắt buộc)** + **Task 1** + phân tích **Task 4** (trong report).

---

## 1. Yêu cầu môi trường

- Docker + Docker Compose
- (Cho Task 0) một cluster K8s local: `kind` / `minikube` / `k3s` + `kubectl`
- Không bắt buộc: Node.js 20 (nếu muốn chạy app trực tiếp ngoài container)

---

## 2. Chạy stack local bằng docker-compose

```bash
docker compose up -d --build
```

| Dịch vụ | URL | Ghi chú |
|---|---|---|
| App | http://localhost:3000 | `/`, `/api/products`, `/health/live`, `/health/ready` |
| Jenkins | http://localhost:8080 | Setup wizard đã tắt |

Test nhanh app:

```bash
curl http://localhost:3000/health/ready
curl http://localhost:3000/api/products
```

### Kết nối Jenkins agent

Agent trong compose ở chế độ inbound (JNLP). Sau khi Jenkins chạy:

1. Jenkins → *Manage Jenkins → Nodes → New Node* → tạo node tên `linux-agent`, label `linux`, launch method *Launch agent by connecting it to the controller*.
2. Copy `secret` mà Jenkins sinh ra, gán vào biến môi trường rồi dựng lại agent:

```bash
export AGENT_SECRET=<secret-tu-jenkins>
docker compose up -d jenkins-agent
```

> Có thể mock phần agent bằng cách chạy pipeline trực tiếp trên controller (label `built-in`) — nêu rõ trong report.

---

## 3. Chạy Task 0 – Deploy lên Kubernetes (không qua Jenkins)

```bash
# Tạo cluster (ví dụ kind)
kind create cluster --name casestudy

# Build + load image + apply manifests + rollout
./scripts/deploy-local.sh 1.0.0

# Truy cập app
kubectl -n demo port-forward svc/demo-app 8081:80
curl http://localhost:8081/health/ready
```

Rollback thử:

```bash
kubectl -n demo rollout undo deployment/demo-app
kubectl -n demo rollout status deployment/demo-app
```

---

## 4. Pipeline Jenkins (Task 1)

1. Tạo credentials trong Jenkins:
   - `registry-cred` (username/password) — push image.
   - `kubeconfig` (secret file) — kubeconfig trỏ tới cluster.
2. Tạo *Pipeline* job → *Pipeline script from SCM* → trỏ vào repo này (dùng `Jenkinsfile`).
3. Build. Flow: Checkout → Test & Quality (parallel) → Build image → Push → Deploy K8s → Smoke test. Fail ở bất kỳ đâu sau deploy → **tự động rollback** (`post { failure }`).

Sửa biến `REGISTRY`, `K8S_NS` trong `Jenkinsfile` cho đúng môi trường của bạn.

---

## 5. Cấu trúc thư mục

```
devops-casestudy/
├── app/                  # demo application + Dockerfile + test
├── k8s/                  # manifests (Task 0)
├── jenkins/              # custom Jenkins image (docker-cli + kubectl)
├── scripts/              # deploy-local.sh
├── docs/                 # report PDF/Word + slide deck
├── docker-compose.yml
├── Jenkinsfile           # pipeline (Task 1)
└── README.md
```

---

## 6. Những phần được mock (nêu rõ để minh bạch)

- **Image registry**: mặc định `docker.io/myorg` — đổi sang registry thật (Docker Hub / GHCR / Harbor).
- **Jenkins agent**: dùng inbound-agent, cần secret sinh khi tạo node; có thể chạy trên controller để đơn giản khi demo.
- **Smoke test** gọi `svc.cluster.local` nên cần chạy khi Jenkins nằm trong cluster hoặc có kết nối tới cluster; bản local có thể thay bằng `port-forward` rồi `curl`.
