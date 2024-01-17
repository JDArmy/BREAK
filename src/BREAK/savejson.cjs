// 用于将 all.json 文件中的键值对按前缀分组，并将每个前缀的键值对保存到一个新的 JSON 文件中

// eslint-disable-next-line no-undef
const fs = require("fs");

const filename = "abilityProviders.json";
const parentKey = "abilityProviders";

// 读取 all.json 文件
fs.readFile(filename, "utf8", (err, data) => {
  if (err) {
    console.error(err);
    return;
  }

  // 解析 JSON 数据
  const json = JSON.parse(data);
  const lists = json[parentKey];

  // 创建一个对象来存储每个前缀的键值对
  const groupedLists = {};

  // 遍历每个键值对
  for (const key in lists) {
    // 获取键的前缀
    const prefix = key.split("-")[0];

    // 如果 groupedLists 对象中还没有这个前缀，就创建一个新的对象
    if (!groupedLists[prefix]) {
      groupedLists[prefix] = {};
    }

    // 将键值对添加到 groupedLists 对象中
    groupedLists[prefix][key] = lists[key];
  }

  // 遍历 groupedLists 对象，为每个前缀创建一个新的 JSON 文件
  for (const prefix in groupedLists) {
    fs.writeFile(`${prefix}.json`, JSON.stringify(groupedLists[prefix], null, 2), (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
});
