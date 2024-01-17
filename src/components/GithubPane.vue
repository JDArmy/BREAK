<script lang="ts" setup>
  import axios from "axios";
  import iconGithub from "@/components/icons/iconGithub.vue";
  import iconStar from "@/components/icons/iconStar.vue";
  import iconFork from "@/components/icons/iconFork.vue";
  import { ref } from "vue";

  const stargazersCount = ref(0);
  const forksCount = ref(0);

  const reposUrl = "https://api.github.com/repos/JDArmy/BREAK";

  axios.interceptors.response.use(
    function (response) {
      // 如果响应状态码是 200，那么直接返回响应
      return response;
    },
    function (error) {
      // 如果响应状态码是 403，那么返回一个自定义的响应
      if (error.response && error.response.status === 403) {
        return {
          data: "Forbidden",
          status: 403,
          statusText: "Forbidden",
          headers: {},
          config: error.config,
        };
      }

      // 如果响应状态码是其他值，那么抛出错误
      return Promise.reject(error);
    }
  );

  const getGithubData = async () => {
    // await axios
    //   .get(reposUrl)
    //   .catch((error) => {
    //     console.error(error);
    //   })
    //   .then((response:any) => {
    //     stargazersCount.value = response.data.stargazers_count;
    //     forksCount.value = response.data.forks_count;
    //   });

    const reposResponse = await axios.get(reposUrl);
    stargazersCount.value = reposResponse.data.stargazers_count;
    forksCount.value = reposResponse.data.forks_count;
  };
  getGithubData();
</script>

<template>
  <div>
    <a href="https://github.com/JDArmy/BREAK" target="_blank">
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
