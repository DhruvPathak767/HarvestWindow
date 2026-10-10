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
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { AuthLayout } from "@/features/auth/AuthLayout";
import { IMAGES } from "@/data/mock/cropCatalog";
import { Button } from "@/components/common/ui";
import { CheckboxField, TextField } from "@/components/common/fields";
import { useToast } from "@/components/feedback/ToastProvider";
import { useStore } from "@/store/AppStore";

const schema = z
  .object({
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
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      terms: false as unknown as true,
    },
  });

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
    await signUp({ fullName: values.fullName, email: values.email });
    setSubmitting(false);
    toast({
      tone: "success",
      title: "Demo session created",
      description:
        "No account was sent to a server — this frontend stores your profile locally.",
    });
    navigate("/app", { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up a workspace for your farms and crops. In this demo build the profile is stored in your browser only."
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
          Create demo account
        </Button>
      </form>
    </AuthLayout>
  );
}
