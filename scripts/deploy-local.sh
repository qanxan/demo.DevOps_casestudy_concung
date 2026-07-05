#!/usr/bin/env bash

set -euo pipefail

TAG="${1:-1.0.0}"
IMAGE="casestudy-demo-app:${TAG}"

echo ">> Build image ${IMAGE}"
docker build --build-arg APP_VERSION="${TAG}" -t "${IMAGE}" ./app

# Load image vao cluster local (chon dung loai cluster ban dang dung)
CURRENT_CONTEXT="$(kubectl config current-context)"
if [[ "${CURRENT_CONTEXT}" == kind-* ]]; then
  KIND_CLUSTER="${CURRENT_CONTEXT#kind-}"
  echo ">> Load image vao kind cluster: ${KIND_CLUSTER}"
  kind load docker-image "${IMAGE}" --name "${KIND_CLUSTER}"
elif [[ "${CURRENT_CONTEXT}" == *minikube* ]]; then
  echo ">> Load image vao minikube"
  minikube image load "${IMAGE}" --profile "${CURRENT_CONTEXT}"
fi

echo ">> Apply manifests (deployment.yaml duoc thay __IMAGE__ bang image that truoc khi apply)"
kubectl apply -f k8s/configmap.yaml -f k8s/service.yaml -f k8s/hpa.yaml -f k8s/ingress.yaml
sed "s#__IMAGE__#${IMAGE}#" k8s/deployment.yaml | kubectl apply -f -

echo ">> Rollout status"
kubectl -n demo rollout status deployment/demo-app --timeout=120s

echo ">> Done. Port-forward de test:"
echo "   kubectl -n demo port-forward svc/demo-app 8081:80"
echo "   curl http://localhost:8081/health/ready"
