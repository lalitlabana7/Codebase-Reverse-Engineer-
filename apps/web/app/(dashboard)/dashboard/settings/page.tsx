"use client";

import React from "react";
import { motion } from "framer-motion";
import { User, Key, Bell, Palette, CreditCard, Copy, Check, Eye, EyeOff, Shield, LogOut, Save, Trash2, Plus, Terminal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const sections = [
  { id: "profile", label: "PROFILE", icon: User, description: "Account details and preferences" },
  { id: "api-keys", label: "API KEYS", icon: Key, description: "API keys for integrations" },
  { id: "notifications", label: "NOTIFICATIONS", icon: Bell, description: "Notification preferences" },
  { id: "appearance", label: "APPEARANCE", icon: Palette, description: "Interface customization" },
  { id: "billing", label: "BILLING", icon: CreditCard, description: "Subscription and billing" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { signOut } = useClerk();

  const handleCopy = (value: string) => { navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(null), 2000); };
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const activeConfig = sections.find(s => s.id === activeSection)!;
  const ActiveIcon = activeConfig.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
          <Terminal className="w-3.5 h-3.5" />
          <span>[root@acre]$ <span className="text-primary">cat ./etc/config</span></span>
        </div>
        <h1 className="text-lg font-bold tracking-wider text-primary uppercase">Settings</h1>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">System configuration and preferences</p>
      </div>

      <div className="flex gap-5 flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-44 flex-shrink-0 space-y-0.5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className={cn("w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs font-mono transition-all duration-200 text-left",
                  isActive ? "bg-primary-muted text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary-muted/30")}>
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="tracking-wider">{section.label}</span>
                {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}
          <Separator className="my-2 bg-primary/10" />
          <button onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm text-xs font-mono text-muted-foreground hover:text-danger hover:bg-danger-muted transition-all">
            <LogOut className="w-3.5 h-3.5" />
            <span className="tracking-wider">SIGN OUT</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Card className="terminal-panel">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-sm bg-primary-muted">
                  <ActiveIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-mono text-primary tracking-wider">{activeConfig.label}</CardTitle>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{activeConfig.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Profile */}
              {activeSection === "profile" && (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-sm bg-primary-muted border border-primary/20 flex items-center justify-center text-lg font-bold text-primary font-mono">U</div>
                    <div>
                      <p className="text-xs font-mono text-primary font-semibold">Display Name</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Update your profile details</p>
                      <Button variant="outline" size="sm" className="mt-1 text-[10px]">CHANGE PHOTO</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[{ label: "FULL NAME", default: "User" }, { label: "EMAIL", default: "user@example.com" }, { label: "USERNAME", default: "user" }, { label: "ROLE", default: "Developer" }].map((f) => (
                      <div key={f.label} className="space-y-1">
                        <label className="text-[10px] font-mono text-muted-foreground tracking-wider">{f.label}</label>
                        <input type="text" defaultValue={f.default} className="w-full terminal-input px-2.5 py-1.5 text-xs font-mono" />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end pt-3 border-t border-primary/10">
                    <Button size="sm" onClick={handleSave} className={cn(saved && "bg-success")}>
                      {saved ? <><Check className="w-3 h-3 mr-1" />SAVED</> : <><Save className="w-3 h-3 mr-1" />SAVE</>}
                    </Button>
                  </div>
                </>
              )}

              {/* API Keys */}
              {activeSection === "api-keys" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-primary font-semibold">Your API Keys</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Keys for ACRE API access</p>
                    </div>
                    <Button size="sm"><Plus className="w-3 h-3 mr-1" />CREATE KEY</Button>
                  </div>
                  <div className="space-y-2">
                    {[["Production API Key", "cb_prod_8f7h3k2m9x1v4b6n", "Jan 15, 2026 · Last used 2 hours ago", "primary"],
                      ["Development API Key", "cb_dev_3m5n7p9r1t2v4w6x", "Mar 3, 2026 · Never used", "secondary"]].map(([name, key, meta, color]) => (
                      <Card key={name as string} className="bg-primary-muted/20 border border-primary/10">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start gap-2">
                              <div className={`p-1 rounded-sm bg-${color}-muted mt-0.5`}>
                                <Key className={`w-3 h-3 text-${color}`} />
                              </div>
                              <div>
                                <p className="text-xs font-mono text-primary">{name as string}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <code className="text-[10px] font-mono text-muted-foreground">
                                    {showApiKey ? key : (key as string).slice(0, 7) + "••••••••••••••••"}
                                  </code>
                                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-0.5 rounded text-muted-foreground hover:text-primary">
                                    {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{meta as string}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleCopy(key as string)}
                                className="p-1.5 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary-muted/30 transition-all">
                                {copied === key ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                              </button>
                              <button className="p-1.5 rounded-sm text-muted-foreground hover:text-danger hover:bg-danger-muted transition-all">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="p-3 rounded-sm bg-primary-muted/30 border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-mono text-primary">Security Notice</p>
                        <p className="text-[10px] font-mono text-primary/70 mt-0.5">Never share API keys publicly. Rotate keys regularly.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notifications */}
              {activeSection === "notifications" && (
                <div className="space-y-3">
                  {(function() {
                    const items = [
                      { title: "Scan Complete", desc: "Get notified when analysis completes", Icon: Bell, color: "primary" },
                      { title: "Security Alerts", desc: "Critical vulnerability alerts", Icon: Shield, color: "danger" },
                      { title: "Weekly Reports", desc: "Weekly security summaries", Icon: Bell, color: "accent" },
                      { title: "Email Notifications", desc: "Receive notifications via email", Icon: Bell, color: "secondary" },
                      { title: "Push Notifications", desc: "Browser push notifications", Icon: Bell, color: "success" },
                    ];
                    return items.map((item) => {
                      const NotifIcon = item.Icon;
                      return (
                    <div key={item.title} className="flex items-center justify-between p-3 rounded-sm border border-primary/10 bg-primary-muted/20">
                      <div className="flex items-start gap-2">
                        <div className={`p-1 rounded-sm bg-${item.color}-muted mt-0.5`}>
                          <NotifIcon className={`w-3 h-3 text-${item.color}`} />
                        </div>
                        <div>
                          <p className="text-xs font-mono text-primary">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-8 h-4 bg-primary/10 rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-primary-foreground after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                      );
                    });
                  })()}
                  <div className="flex justify-end pt-3 border-t border-primary/10">
                    <Button size="sm" onClick={handleSave} className={cn(saved && "bg-success")}>
                      {saved ? <><Check className="w-3 h-3 mr-1" />SAVED</> : <><Save className="w-3 h-3 mr-1" />SAVE</>}
                    </Button>
                  </div>
                </div>
              )}

              {/* Appearance */}
              {activeSection === "appearance" && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-mono text-primary font-semibold mb-2">THEME</p>
                    <div className="grid grid-cols-3 gap-3">
                      {["DARK MODE", "SYSTEM", "LIGHT"].map((theme, i) => (
                        <button key={theme} className={`px-3 py-2 rounded-sm text-xs font-mono border ${i === 0 ? 'bg-primary-muted text-primary border-primary/30' : 'bg-transparent text-muted-foreground border-primary/10 opacity-50 pointer-events-none'}`}>
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-primary font-semibold mb-2">FONT SIZE</p>
                    <div className="flex gap-2">
                      {["SMALL", "MEDIUM", "LARGE"].map((size, i) => (
                        <button key={size} className={`flex-1 px-3 py-1.5 rounded-sm text-xs font-mono border ${i === 1 ? 'bg-primary-muted text-primary border-primary/30' : 'bg-transparent text-muted-foreground border-primary/10 hover:text-primary'}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Billing */}
              {activeSection === "billing" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { name: "FREE", price: "$0", desc: "Up to 3 repos, basic scanning", popular: false },
                      { name: "PRO", price: "$29", desc: "Unlimited repos, advanced AI", popular: true },
                      { name: "ENTERPRISE", price: "$99", desc: "Everything in Pro + team", popular: false },
                    ].map((plan) => (
                      <Card key={plan.name} className={`${plan.popular ? 'bg-primary-muted/30 border-primary/30' : 'bg-primary-muted/10 border-primary/10'} text-center`}>
                        <CardContent className="p-4">
                          {plan.popular && <Badge variant="primary" className="text-[8px] mb-2">POPULAR</Badge>}
                          <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">{plan.name}</p>
                          <p className="text-xl font-bold font-mono text-primary mb-1">{plan.price}<span className="text-[10px] text-muted-foreground">/mo</span></p>
                          <p className="text-[9px] text-muted-foreground font-mono mb-4">{plan.desc}</p>
                          <Button size="sm" variant={plan.popular ? "default" : "outline"} className="w-full text-[10px]">
                            {plan.name === "FREE" ? "CURRENT" : plan.name === "PRO" ? "UPGRADE" : "CONTACT"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <div className="p-3 rounded-sm border border-primary/10 bg-primary-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-mono text-primary">Current Billing Period</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Free Plan · No payment method</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-[10px]">INVOICES</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
