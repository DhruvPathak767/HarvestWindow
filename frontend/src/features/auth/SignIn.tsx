import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, LogIn, Mail, Sparkles, TriangleAlert } from "lucide-react";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { Button, buttonStyles } from "@/components/common/ui";
import { CheckboxField, TextField } from "@/components/common/fields";
import { useToast } from "@/components/feedback/ToastProvider";
import { DEMO_CREDENTIALS } from "@/data/mock/seed";
import { useStore } from "@/store/AppStore";

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .email("That does not look like a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function SignIn() {
  const navigate = useNavigate();
  const { signIn, startDemoSession } = useStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const remember = watch("remember");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setFormError(null);
    const result = await signIn(values.email, values.password);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message ?? "Sign in failed.");
      return;
    }
    toast({
      tone: "success",
      title: "Welcome back",
      description: "Signed in successfully with MySQL backend.",
    });
    navigate("/app", { replace: true });
  };

  const useDemo = () => {
    setValue("email", DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue("password", DEMO_CREDENTIALS.password, { shouldValidate: true });
    setFormError(null);
    toast({
      tone: "info",
      title: "Demo credentials filled in",
      description: "Press “Sign in” to enter the workspace.",
    });
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Open your farms, crops and harvest estimates. The demo workspace arrives pre-populated."
      footer={
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-line bg-soft/70 p-4">
            <p className="flex items-center gap-2 font-display text-[12.5px] font-bold text-forest-deep">
              <Sparkles className="h-4 w-4 text-living" aria-hidden />
              Demo account
            </p>
            <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-muted">
              {DEMO_CREDENTIALS.email}
              <br />
              {DEMO_CREDENTIALS.password}
            </p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={useDemo} type="button">
              Fill demo credentials
            </Button>
          </div>
          <p className="text-[13px] text-muted">
            New to HarvestWindow?{" "}
            <Link to="/sign-up" className="font-semibold text-forest">
              <span className="hw-link-underline">Create an account</span>
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.22 }}
              role="alert"
              className="flex items-start gap-2.5 overflow-hidden rounded-md border border-danger/35 bg-[#fdf1ee] px-3.5 py-3"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
              <p className="text-[12.5px] leading-relaxed text-[#8d3a26]">{formError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          required
          placeholder="you@farm.example"
          leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="relative">
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            leadingIcon={<KeyRound className="h-4 w-4" aria-hidden />}
            error={errors.password?.message}
            className="[&_input]:pr-11"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute top-[34px] right-2 grid h-8 w-8 place-items-center rounded-sm text-muted transition-colors hover:bg-soft hover:text-forest-deep"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <CheckboxField
            label="Remember me on this device"
            checked={remember}
            onChange={(v) => setValue("remember", v)}
          />
          <button
            type="button"
            onClick={() =>
              toast({
                tone: "info",
                title: "Password reset is not wired in this demo",
                description: "Use the demo credentials shown below to continue.",
              })
            }
            className="text-[12.5px] font-semibold text-forest transition-colors hover:text-living"
          >
            Forgot password?
          </button>
        </div>

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          {!submitting && <LogIn className="h-4 w-4" aria-hidden />}
          Sign in
        </Button>

        <button
          type="button"
          className={buttonStyles("ghost", "md", "w-full")}
          onClick={() => {
            startDemoSession();
            navigate("/app", { replace: true });
          }}
        >
          Skip — explore the demo workspace
        </button>
      </form>
    </AuthLayout>
  );
}
