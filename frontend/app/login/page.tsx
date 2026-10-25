'use client';

import { useState } from "react";

import { AuthProvider } from "@/contexts/auth-context";
import Login from "@/components/login";
import Register from "@/components/register";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);

    return (
        <AuthProvider>
            <main className="min-h-screen bg-[#f7f4ee] px-4 py-4 text-[#28241f] sm:px-6 lg:px-8">
                <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] bg-[#fffdf9] shadow-[0_24px_80px_rgba(51,42,29,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
                    <section className="relative hidden min-h-[720px] overflow-hidden bg-[#273b32] lg:block">
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,45,36,0.04)_22%,rgba(25,45,36,0.88)_100%),url('https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85')] bg-cover bg-center" />
                        <div className="relative flex h-full flex-col justify-between p-10 text-[#fffaf1] xl:p-14">
                            <div className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] uppercase">
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5a524] text-xl text-[#273b32]">L</span>
                                Cravio
                            </div>
                            <div className="max-w-md">
                                <p className="mb-5 text-xs font-semibold tracking-[0.26em] text-[#f8c76d] uppercase">Good food, beautifully delivered</p>
                                <h1 className="font-serif text-5xl leading-[0.98] tracking-[-0.04em] xl:text-6xl">Your next favorite meal is closer than you think.</h1>
                                <p className="mt-6 max-w-sm text-base leading-7 text-[#f4eee3]/78">From neighborhood gems to midnight cravings, discover food worth slowing down for.</p>
                            </div>
                        </div>
                    </section>

                    <section className="flex min-h-[calc(100vh-2rem)] flex-col px-6 py-8 sm:px-12 sm:py-12 lg:px-16 xl:px-24 xl:py-14">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-[#273b32] uppercase lg:hidden">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5a524] text-[#273b32]">L</span>
                                Cravio
                            </div>
                            <p className="ml-auto text-xs font-medium tracking-[0.14em] text-[#81786c] uppercase">Est. 2024 · NYC</p>
                        </div>

                        <div className="my-auto w-full max-w-[440px] self-center py-12">
                            <div className="mb-9">
                                <p className="mb-3 text-sm font-semibold text-[#d97732]">Welcome to the table</p>
                                <h2 className="font-serif text-4xl leading-tight tracking-[-0.035em] text-[#28241f] sm:text-5xl">{isLogin ? "Come on in." : "Make it yours."}</h2>
                                <p className="mt-3 text-[15px] leading-6 text-[#81786c]">{isLogin ? "Your favorites, saved addresses, and better bites await." : "Join a community that knows good food when it tastes it."}</p>
                            </div>

                            <div className="mb-8 grid grid-cols-2 rounded-xl bg-[#f2eee6] p-1" role="tablist" aria-label="Account access">
                                <button type="button" role="tab" aria-selected={isLogin} onClick={() => setIsLogin(true)} className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${isLogin ? "bg-white text-[#273b32] shadow-sm" : "text-[#8b8277] hover:text-[#4e493f]"}`}>Sign in</button>
                                <button type="button" role="tab" aria-selected={!isLogin} onClick={() => setIsLogin(false)} className={`rounded-lg px-4 py-3 text-sm font-semibold transition ${!isLogin ? "bg-white text-[#273b32] shadow-sm" : "text-[#8b8277] hover:text-[#4e493f]"}`}>Create account</button>
                            </div>

                            {isLogin ? <Login /> : <Register />}
                        </div>

                        <p className="text-center text-xs leading-5 text-[#9a9287]">By continuing, you agree to our <a href="#terms" className="font-semibold text-[#6d665d] underline underline-offset-2">Terms</a> and <a href="#privacy" className="font-semibold text-[#6d665d] underline underline-offset-2">Privacy Policy</a>.</p>
                    </section>
                </div>
            </main>
        </AuthProvider>
    )
}