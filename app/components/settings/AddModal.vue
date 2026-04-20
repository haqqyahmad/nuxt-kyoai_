<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { AxiosInstance } from "axios";
import { handleError, handleSuccess } from "~/utils/handlers";

const schema = z.object({
  name: z.string().min(2, "Too short"),
});

const loading = ref(false);
const open = ref(false);

type Schema = z.output<typeof schema>;

const state = reactive<Partial<Schema>>({
  name: "",
});

const api = useApi();
// const { registerUser } = useAuth();
const toast = useToast();

function resetForm() {
  state.name = "";
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (loading.value) return;

  loading.value = true;

  try {
    await registerUser({
      name: state.name,
    });

    handleSuccess(toast, state.name);
    resetForm();
    open.value = false;
  } catch (err: any) {
    handleError(toast, err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="New Role"
    description="Add a new role to the database"
  >
    <UButton label="New Role" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" placeholder="John Doe" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField
          label="Email"
          placeholder="john.doe@example.com"
          name="email"
        >
          <UInput v-model="state.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Create User"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
