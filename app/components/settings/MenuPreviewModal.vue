<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

type Role = {
  id: number
  name: string
  permissions: Array<{
    permission: { name: string }
  }>
}

import { restrictedRoles as restrictedRolesList, externalRoles as externalRolesList } from '~/constants/menu'

const props = defineProps<{
  open: boolean
  role: Role | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { getMenuPreview } = useMenuPreview()
const { hasRouteAccess } = useRoutePermission()

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const restrictedRoles = restrictedRolesList
const externalRoles = externalRolesList

const previewMenu = computed<NavigationMenuItem[]>(() => {
  if (!props.role) return []

  const permissions = props.role.permissions.map(p => p.permission.name)
  const roleName = props.role.name.toLowerCase()

  const isRestricted = restrictedRoles.includes(roleName)
  const isExternal = externalRoles.includes(roleName)

  return getMenuPreview(permissions, hasRouteAccess, {
    isRestricted,
    isExternal,
    roleName: props.role.name
  })
})

const permissionCount = computed(() => props.role?.permissions.length ?? 0)

function getMenuIcon(item: NavigationMenuItem): string {
  return (item.icon as string) || 'i-lucide-circle'
}

function countVisibleItems(items: NavigationMenuItem[]): number {
  return items.reduce((count, item) => {
    if (item.children) {
      return count + countVisibleItems(item.children as NavigationMenuItem[])
    }
    return count + 1
  }, 0)
}

const totalVisibleItems = computed(() => countVisibleItems(previewMenu.value))
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <UIcon name="i-lucide-eye" class="size-5 text-primary" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-highlighted">
            Preview Menu
          </h3>
          <p class="text-sm text-muted">
            Menu yang terlihat untuk role <span class="font-medium text-highlighted">{{ role?.name }}</span>
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div v-if="role" class="space-y-4">
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-key" class="size-4 text-muted" />
            <span class="text-muted">{{ permissionCount }} permissions</span>
          </div>
          <div class="flex items-center gap-1.5">
            <UIcon name="i-lucide-menu" class="size-4 text-muted" />
            <span class="text-muted">{{ totalVisibleItems }} menu items</span>
          </div>
        </div>

        <div class="rounded-xl border border-default bg-muted/20 p-4">
          <div class="space-y-1">
            <template v-for="item in previewMenu" :key="item.label">
              <div class="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted/50">
                <UIcon :name="getMenuIcon(item)" class="size-4 text-muted" />
                <span class="text-sm font-medium text-highlighted">{{ item.label }}</span>
              </div>

              <template v-if="item.children">
                <template v-for="child in (item.children as NavigationMenuItem[])" :key="child.label">
                  <div class="flex items-center gap-2 rounded-lg px-3 py-1.5 pl-9 hover:bg-muted/50">
                    <UIcon
                      v-if="child.children"
                      name="i-lucide-chevron-right"
                      class="size-3 text-muted"
                    />
                    <UIcon
                      v-else
                      name="i-lucide-circle"
                      class="size-1.5 text-muted"
                    />
                    <span class="text-sm text-highlighted">{{ child.label }}</span>
                  </div>

                  <template v-if="child.children">
                    <div
                      v-for="grandchild in (child.children as NavigationMenuItem[])"
                      :key="grandchild.label"
                      class="flex items-center gap-2 rounded-lg px-3 py-1.5 pl-16 hover:bg-muted/50"
                    >
                      <UIcon name="i-lucide-circle" class="size-1 text-muted" />
                      <span class="text-sm text-muted">{{ grandchild.label }}</span>
                    </div>
                  </template>
                </template>
              </template>
            </template>
          </div>
        </div>

        <p v-if="previewMenu.length === 0" class="py-8 text-center text-sm text-muted">
          Tidak ada menu yang terlihat untuk role ini.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          color="neutral"
          variant="soft"
          @click="isOpen = false"
        >
          Tutup
        </UButton>
      </div>
    </template>
  </UModal>
</template>
