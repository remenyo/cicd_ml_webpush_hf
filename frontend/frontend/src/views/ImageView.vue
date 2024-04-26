<template>
  <div>
    <ImageView :imageName="imageName" />
    <SubscriptionButton />
  </div>
</template>

<script>
import SubscriptionButton from "../components/SubscriptionButton.vue";

export default {
  computed: {
    imageName() {
      return this.$route.params.id;
    },
  },
};
</script>