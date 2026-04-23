<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent, AuthFormField } from "@nuxt/ui";
import type { AxiosInstance } from "axios";
import { handleError, handleSuccess } from '~/utils/handlers'

const api = useApi();
const { setToken } = useAuth();
const { registerUser } = useUser();

definePageMeta({
  layout: "auth",
  middleware: "guest",
});

const loading = ref(false);
const open = ref(false);
const toast = useToast();

const items = [
  {
    label: "Login",
    icon: "i-lucide-user",
    slot: "login",
  },
  {
    label: "Register",
    icon: "i-lucide-edit",
    slot: "register",
  },
];

const fields: AuthFormField[] = [
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    required: true,
  },
  {
    name: "remember",
    label: "Remember me",
    type: "checkbox",
  },
];

const Regfields: AuthFormField[] = [
  {
    name: "name",
    type: "text",
    label: "Name",
    placeholder: "Enter your name",
    required: true,
  },
  {
    name: "email",
    type: "email",
    label: "Email",
    placeholder: "Enter your email",
    required: true,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    required: true,
  },
  {
    name: "confirm_password",
    label: "Confirm Password",
    type: "password",
    placeholder: "Confirm your password",
    required: true,
  },
];

const providers = [{}];

const schema = z
  .object({
    email: z.email("Invalid email"),
    password: z
      .string("Password is required")
      .min(8, "Must be at least 8 characters"),
  });
const Regschema = z
  .object({
    name: z.string().min(2, "Too short"),
    email: z.email("Invalid email"),
    password: z
      .string("Password is required")
      .min(8, "Must be at least 8 characters"),
    confirm_password: z
      .string("Password is required")
      .min(8, "Must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type Schema = z.output<typeof schema>;
type RegSchema = z.output<typeof Regschema>;

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    const res = await api.post("/auth/login", {
      email: payload.data.email,
      password: payload.data.password,
    });
    setToken(res.data.data.token);

    toast.add({
      title: "Login berhasil",
      color: "success",
    });

    await navigateTo("/");
  } catch (err: any) {
    toast.add({
      title: "Login gagal",
      description: err.response?.data?.message || "Terjadi kesalahan",
      color: "error",
    });
  }
}

async function onRegist(event: FormSubmitEvent<RegSchema>) {
  if (loading.value) return;

  loading.value = true;

  try {
    await registerUser({
      /**
       * @haqqy, pake event ya pak jangan state, biar data udah di validasi pake zod
       */
      name: event.data.name,
      email: event.data.email,
      password: event.data.password,
      confirm_password: event.data.confirm_password,
    });

    handleSuccess(toast, event.data.name);
    // resetForm();
    open.value = false;
    // emit("created");
  } catch (err: any) {
    handleError(toast, err);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 mt-5">
    <UTabs :items="items">
      <template #login>
        <UPageCard class="w-full max-w-md">
          <UAuthForm
            :schema="schema"
            title="Login"
            description="Enter your credentials to access your account."
            icon="i-lucide-user"
            :fields="fields"
            :submit="{
              label: 'Masuk',
              color: 'secondary',
              size: 'lg',
              loading: false,
            }"
            @submit="onSubmit"
          />
        </UPageCard>
      </template>
      <template #register>
        <UPageCard class="w-full max-w-md">
          <UAuthForm
            :schema="schema"
            title="Register"
            description="Input your credentials to create your account."
            icon="i-lucide-edit"
            :fields="Regfields"
            :submit="{
              label: 'Daftar',
              color: 'success',
              size: 'lg',
              loading: false,
            }"
            @submit="onRegist"
          />
        </UPageCard>
      </template>
    </UTabs>
  </div>
</template>
