"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Eye, EyeOff, Heart, Sparkles } from "lucide-react";
import { loginWithKey } from "@/services/auth";
import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await loginWithKey(password);
      router.push("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 opacity-20">
          <Heart className="w-24 h-24" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20">
          <Sparkles className="w-24 h-24" />
        </div>
        <div className="absolute top-1/2 right-20 opacity-20">
          <Star className="w-16 h-16" />
        </div>
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10"
      >
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
          Welcome Back
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-md mx-auto">
          Enter your special key to continue our journey
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="space-y-4 w-full max-w-md z-10"
      >
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your special key"
              className="w-full py-6 px-4 pr-12 bg-white/90 backdrop-blur-sm text-purple-600 placeholder:text-purple-400 rounded-lg"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-red-300 text-sm text-center bg-red-500/10 py-2 rounded-lg">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full py-6 text-lg bg-purple-500/90 backdrop-blur-sm hover:bg-purple-500 transition-all duration-300"
            disabled={isLoading}
          >
            {isLoading ? "Entering..." : "Enter Our Space"}
          </Button>
        </form>
      </motion.div>

      {/* Glass effect card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="mt-12 p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 max-w-md w-full"
      >
        <p className="text-center text-sm text-purple-100">
          &quot;Every memory with you is a story worth telling, every moment a
          treasure worth keeping.&quot;
        </p>
      </motion.div>
    </div>
  );
}
