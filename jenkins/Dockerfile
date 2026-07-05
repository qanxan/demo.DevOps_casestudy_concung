# Jenkins controller custom: them docker-cli + kubectl de pipeline
# co the build image va deploy len K8s truc tiep tu agent.
FROM jenkins/jenkins:lts-jdk17

USER root

# docker-cli (dung docker.sock cua host - Docker-outside-of-Docker)
RUN apt-get update && apt-get install -y --no-install-recommends \
      docker.io \
      curl \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# kubectl
RUN curl -fsSLo /usr/local/bin/kubectl \
      "https://dl.k8s.io/release/v1.30.2/bin/linux/amd64/kubectl" \
    && chmod +x /usr/local/bin/kubectl

# Cai san plugin can thiet (bo qua setup wizard)
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
