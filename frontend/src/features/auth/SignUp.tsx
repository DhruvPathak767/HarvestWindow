import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Sprout,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { IMAGES } from "@/data/mock/cropCatalog";
import { Button } from "@/components/common/ui";
import { CheckboxField, TextField } from "@/components/common/fields";
import { useToast } from "@/components/feedback/ToastProvider";
import { useStore } from "@/store/AppStore";
import { cn } from "@/utils/cn";

const schema = z
  .object({
    role: z.enum(["FARMER", "SELLER"]),
    fullName: z.string().trim().min(2, "Enter your full name").max(60),
    email: z.string().trim().min(1, "Enter your email").email("That does not look like a valid email"),
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    terms: z.literal(true, { message: "You need to accept the terms to continue" }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useStore();
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
    resolver: zodResolver(schema) as never,
    defaultValues: {
      role: "FARMER",
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false as unknown as true,
    },
  });

  const selectedRole = watch("role") ?? "FARMER";
  const terms = watch("terms");
  const passwordValue = watch("password") ?? "";

  const strength = (() => {
    let score = 0;
    if (passwordValue.length >= 8) score += 1;
    if (/[0-9]/.test(passwordValue)) score += 1;
    if (/[A-Za-z]/.test(passwordValue)) score += 1;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 1;
    return score;
  })();

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setFormError(null);
    const result = await signUp({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message ?? "Registration failed.");
      return;
    }
    toast({
      tone: "success",
      title: "Account created",
      description:
        values.role === "SELLER"
          ? "Welcome to HarvestWindow. Your seller workspace is ready."
          : "Welcome to HarvestWindow. Your farmer workspace is ready.",
    });
    navigate("/app", { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up a workspace for your farms and crops with authentic harvest predictions."
      image={IMAGES.authSplitAlt}
      imageAlt="Two farmers harvesting in a lush green rice field"
      footer={
        <p className="text-[13px] text-muted">
          Already registered?{" "}
          <Link to="/sign-in" className="font-semibold text-forest">
            <span className="hw-link-underline">Sign in instead</span>
          </Link>
        </p>
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

        {/* User Role Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="font-display text-[12.5px] font-semibold tracking-[-0.005em] text-forest-deep">
            I am joining as a <span className="ml-0.5 text-caution">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setValue("role", "FARMER")}
              className={cn(
                "group relative flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-forest/30",
                selectedRole === "FARMER"
                  ? "border-forest bg-[#eef4ea] shadow-sm ring-1 ring-forest/20"
                  : "border-line bg-white hover:border-forest/50 hover:bg-soft/40"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition-colors",
                    selectedRole === "FARMER"
                      ? "bg-forest text-cream"
                      : "bg-soft text-muted group-hover:text-forest-deep"
                  )}
                >
                  <Sprout className="h-4 w-4" aria-hidden />
                </span>
                {selectedRole === "FARMER" && (
                  <span className="h-2 w-2 rounded-full bg-forest" />
                )}
              </div>
              <p className="mt-1 font-display text-[13px] font-bold text-forest-deep">
                Farmer / Producer
              </p>
              <p className="text-[11px] leading-tight text-muted">
                Manage land, crops & harvest forecasts
              </p>
            </button>

            <button
              type="button"
              onClick={() => setValue("role", "SELLER")}
              className={cn(
                "group relative flex flex-col items-start gap-1 rounded-md border p-3 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-forest/30",
                selectedRole === "SELLER"
                  ? "border-forest bg-[#eef4ea] shadow-sm ring-1 ring-forest/20"
                  : "border-line bg-white hover:border-forest/50 hover:bg-soft/40"
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full transition-colors",
                    selectedRole === "SELLER"
                      ? "bg-forest text-cream"
                      : "bg-soft text-muted group-hover:text-forest-deep"
                  )}
                >
                  <Store className="h-4 w-4" aria-hidden />
                </span>
                {selectedRole === "SELLER" && (
                  <span className="h-2 w-2 rounded-full bg-forest" />
                )}
              </div>
              <p className="mt-1 font-display text-[13px] font-bold text-forest-deep">
                Seller / Trader
              </p>
              <p className="text-[11px] leading-tight text-muted">
                Track harvest supply & procurement
              </p>
            </button>
          </div>
        </div>

        <TextField
          label="Full name"
          required
          autoComplete="name"
          placeholder="e.g. Ananya Deshpande"
          leadingIcon={<UserRound className="h-4 w-4" aria-hidden />}
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <TextField
          label="Email address"
          type="email"
          required
          autoComplete="email"
          placeholder="you@farm.example"
          leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="relative">
          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

          {passwordValue && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    animate={{
                      backgroundColor:
                        i < strength
                          ? strength <= 2
                            ? "#C9762F"
                            : "#5B8C45"
                          : "#E3E7DC",
                    }}
                    transition={{ duration: 0.25 }}
                    className="h-1 flex-1 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[11.5px] font-medium text-muted">
                {strength <= 2 ? "Weak" : strength === 3 ? "Reasonable" : "Strong"}
              </span>
            </div>
          )}
        </div>

        <TextField
          label="Confirm password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          placeholder="Repeat your password"
          leadingIcon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <AnimatePresence>
          {errors.terms?.message && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="flex items-center gap-2 text-[12px] font-medium text-danger"
            >
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              {errors.terms.message}
            </motion.p>
          )}
        </AnimatePresence>

        <CheckboxField
          label={
            <>
              I accept the{" "}
              <span className="font-semibold text-forest">terms of use</span> and understand
              that estimates are decision support, not agronomic advice.
            </>
          }
          checked={terms === true}
          onChange={(v) =>
            // The schema requires the literal `true` once accepted.
            setValue("terms", (v ? true : false) as true, { shouldValidate: true })
          }
        />

        <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
