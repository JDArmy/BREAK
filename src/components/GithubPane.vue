<script lang="ts" setup>
import axios from "axios";
import iconGithub from "@/components/icons/iconGithub.vue";
import iconStar from "@/components/icons/iconStar.vue";
import iconFork from "@/components/icons/iconFork.vue";
import { ref } from "vue";

const stargazersCount = ref(0);
const forksCount = ref(0);

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
  <div>
    <a href="https://github.com/JDArmy/BREAK" target="_blank" rel="noopener noreferrer">
      <icon-github />
      <span class="description">
        <icon-star />{{ stargazersCount }} <icon-fork />{{ forksCount }}
      </span>
    </a>
  </div>
</template>

<style scoped>
a {
  text-decoration: none;
  color: #fff;
}

.description {
  font-size: 0.8em;
  margin-left: 0.5em;
}
</style>
