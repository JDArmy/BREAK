<script lang="ts" setup>
import axios from "axios";
import iconGithub from "@/components/icons/iconGithub.vue";
import iconStar from "@/components/icons/iconStar.vue";
import iconFork from "@/components/icons/iconFork.vue";
import { ref } from "vue";

const stargazersCount = ref(0);
const forksCount = ref(0);

// BREAK framework statistics
const stats = {
  risks: 145,
  avoidances: 82,
  attackTools: 69,
  threatActors: 38
};

const reposUrl = "https://api.github.com/repos/JDArmy/BREAK";

const githubApi = axios.create();
githubApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 403) {
      return {
        data: { stargazers_count: 0, forks_count: 0 },
        status: 403,
      };
    }
    return Promise.reject(error);
  }
);

const getGithubData = async () => {
  try {
    const reposResponse = await githubApi.get(reposUrl);
    stargazersCount.value = reposResponse.data.stargazers_count;
    forksCount.value = reposResponse.data.forks_count;
  } catch {
    // GitHub API unavailable, keep default values
  }
};
getGithubData();
</script>

<template>
  <div class="github-pane">
    <div class="stats">
      <span class="stat-item">{{ stats.risks }} Risks</span>
      <span class="stat-item">{{ stats.avoidances }} Avoidances</span>
      <span class="stat-item">{{ stats.attackTools }} Attack Tools</span>
      <span class="stat-item">{{ stats.threatActors }} Threat Actors</span>
    </div>
    <a href="https://github.com/JDArmy/BREAK" target="_blank" rel="noopener noreferrer">
      <icon-github />
      <span class="description">
        <icon-star />{{ stargazersCount }} <icon-fork />{{ forksCount }}
      </span>
    </a>
  </div>
</template>

<style scoped>
.github-pane {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.75em;
  color: #cbd5e1;
}

.stat-item {
  white-space: nowrap;
}

a {
  text-decoration: none;
  color: #fff;
  display: flex;
  align-items: center;
}

.description {
  font-size: 0.8em;
  margin-left: 0.5em;
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
