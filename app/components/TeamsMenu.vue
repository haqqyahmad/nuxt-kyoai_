<script setup lang="ts">
import type { DropdownMenuItem } from "@nuxt/ui";

defineProps<{
  collapsed?: boolean;
}>();

const { user, fetchUser } = useUser();

onMounted(async () => {
  const { getToken } = useAuth();
  const token = getToken();

  console.log("TOKEN:", token);

  if (token) {
    await fetchUser();
  }
});

console.log("USER:", user.value?.data);

function capitalizeWords(text: string) {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const userDisplay = computed(() => {
  return {
    name: user.value?.data?.name
      ? capitalizeWords(user.value.data.name)
      : "User",
    avatar: {
      src: user.value?.data?.avatar || "/default-avatar.png",
      alt: user.value?.data?.name || "User",
    },
  };
});

const teams = ref([
  {
    label: userDisplay.value?.name,
    avatar: {
      src: userDisplay.value?.avatar,
      alt: userDisplay.value?.name,
    },
  },
  {
    label: "NuxtHub",
    avatar: {
      src: "https://github.com/nuxt-hub.png",
      alt: "NuxtHub",
    },
  },
  {
    label: "NuxtLabs",
    avatar: {
      src: "https://github.com/nuxtlabs.png",
      alt: "NuxtLabs",
    },
  },
]);
const selectedTeam = ref(teams.value[0]);

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    teams.value.map((team) => ({
      ...team,
      onSelect() {
        selectedTeam.value = team;
      },
    })),
    [
      {
        label: "Create team",
        icon: "i-lucide-circle-plus",
      },
      {
        label: "Manage teams",
        icon: "i-lucide-cog",
      },
    ],
  ];
});
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <UButton
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
</template>
