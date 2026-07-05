// =============================================================================
// Jenkinsfile - CI/CD pipeline cho demo web app (Con Cung DevOps Case Study)
//
// Flow: Checkout -> Install & Test (parallel: unit test + lint/audit)
//       -> Build Docker image -> Push image -> Deploy len Kubernetes
//       -> Smoke test -> (rollback tu dong neu smoke test fail)
//
// Yeu cau tren Jenkins:
//   - Agent co label 'linux' (docker-cli + kubectl da cai san trong image controller)
//   - Credentials:
//       * 'registry-cred'  (username/password)  -> push image
//       * 'kubeconfig'     (secret file)         -> ket noi K8s cluster
// =============================================================================

pipeline {
  agent { label 'linux' }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    REGISTRY     = 'docker.io/myorg'                 // doi thanh registry that
    IMAGE_NAME   = 'casestudy-demo-app'
    IMAGE_TAG    = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(8) : env.BUILD_NUMBER}"
    IMAGE_REF    = "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    K8S_NS       = 'demo'
    DEPLOYMENT   = 'demo-app'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          echo "Building commit ${env.GIT_COMMIT} -> image tag ${IMAGE_TAG}"
        }
      }
    }

    // ------------------------------------------------------------------
    // Chay test + kiem tra chat luong song song de tiet kiem thoi gian
    // ------------------------------------------------------------------
    stage('Test & Quality') {
      parallel {
        stage('Unit Test') {
          agent {
            docker {
              image 'node:20-alpine'
              reuseNode true
            }
          }
          steps {
            dir('app') {
              sh 'npm ci'
              sh 'npm test'
            }
          }
          post {
            always {
              // Ban co the them junit report o day neu xuat ra junit.xml
              echo 'Unit test stage finished.'
            }
          }
        }
        stage('Lint & Audit') {
          agent {
            docker {
              image 'node:20-alpine'
              reuseNode true
            }
          }
          steps {
            dir('app') {
              sh 'npm ci'
              // audit khong lam fail build (production deps), chi canh bao
              sh 'npm audit --omit=dev || true'
            }
          }
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        sh """
          docker build \
            --build-arg APP_VERSION=${IMAGE_TAG} \
            -t ${IMAGE_REF} \
            -t ${REGISTRY}/${IMAGE_NAME}:latest \
            ./app
        """
      }
    }

    stage('Push Image') {
      steps {
        withCredentials([usernamePassword(
            credentialsId: 'registry-cred',
            usernameVariable: 'REG_USER',
            passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin
            docker push ''' + "${IMAGE_REF}" + '''
            docker push ''' + "${REGISTRY}/${IMAGE_NAME}:latest" + '''
            docker logout "$REGISTRY"
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh """
            kubectl -n ${K8S_NS} apply -f k8s/configmap.yaml -f k8s/service.yaml -f k8s/hpa.yaml -f k8s/ingress.yaml
            sed "s#__IMAGE__#${IMAGE_REF}#" k8s/deployment.yaml | kubectl -n ${K8S_NS} apply -f -
          """
          script {
            env.DEPLOYED = 'true'
          }
          sh """
            kubectl -n ${K8S_NS} rollout status deployment/${DEPLOYMENT} --timeout=120s
          """
        }
      }
    }

    // ------------------------------------------------------------------
    // Smoke test sau deploy - neu fail se nem loi -> vao post{ failure }
    // de rollback tu dong
    // ------------------------------------------------------------------
    stage('Smoke Test') {
      steps {
        withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
          sh """
            kubectl -n ${K8S_NS} run smoke-\$BUILD_NUMBER --rm -i --restart=Never \
              --image=curlimages/curl:8.8.0 -- \
              curl -fsS http://${DEPLOYMENT}.${K8S_NS}.svc.cluster.local/health/ready
          """
        }
      }
    }
  }

  // --------------------------------------------------------------------
  // Xu ly ket qua build
  // --------------------------------------------------------------------
  post {
    success {
      echo "Deploy thanh cong: ${IMAGE_REF}"
    }
    failure {
      script {
        if (env.DEPLOYED == 'true') {
          withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
            sh """
              kubectl -n ${K8S_NS} rollout undo deployment/${DEPLOYMENT} || true
              kubectl -n ${K8S_NS} rollout status deployment/${DEPLOYMENT} --timeout=120s || true
            """
          }
        } else {
          echo "Chua toi buoc Deploy, khong can rollback."
        }
      }
    }
    always {
      sh 'docker image prune -f || true'
      cleanWs()
    }
  }
}
