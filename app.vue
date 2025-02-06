<script setup>
const { data } = useFetch("/api/test");
</script>

<template>
  <div>{{ data }}</div>
</template>
