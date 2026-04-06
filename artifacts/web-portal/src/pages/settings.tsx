import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetMe,
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useListSettings,
  useUpdateSettings,
  getListSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Moon, Sun, Languages, User, Receipt } from "lucide-react";

const pinSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});
type PinForm = z.infer<typeof pinSchema>;

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["owner", "staff"]),
});
type UserForm = z.infer<typeof userSchema>;

const billSettingsSchema = z.object({
  kitchen_name: z.string().min(1),
  kitchen_phone: z.string(),
  kitchen_address: z.string(),
  bill_tax_percent: z.string(),
  bill_discount_percent: z.string(),
  bill_thank_you_message: z.string(),
  bill_cta_text: z.string(),
  bill_website: z.string(),
});
type BillSettingsForm = z.infer<typeof billSettingsSchema>;

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [userDialog, setUserDialog] = useState(false);

  const me = useGetMe();
  const users = useListUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const settings = useListSettings();
  const updateSettings = useUpdateSettings();

  const isOwner = (me.data as any)?.role === "owner";

  const pinForm = useForm<PinForm>({
    resolver: zodResolver(pinSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const userForm = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", email: "", password: "", role: "staff" },
  });

  const billForm = useForm<BillSettingsForm>({
    resolver: zodResolver(billSettingsSchema),
    defaultValues: {
      kitchen_name: "",
      kitchen_phone: "",
      kitchen_address: "",
      bill_tax_percent: "0",
      bill_discount_percent: "0",
      bill_thank_you_message: "Thank you for your order!",
      bill_cta_text: "",
      bill_website: "",
    },
  });

  useEffect(() => {
    if (settings.data) {
      const s = settings.data as Record<string, string>;
      billForm.reset({
        kitchen_name: s.kitchen_name ?? "MUFAZ Kitchen",
        kitchen_phone: s.kitchen_phone ?? "",
        kitchen_address: s.kitchen_address ?? "",
        bill_tax_percent: s.bill_tax_percent ?? "0",
        bill_discount_percent: s.bill_discount_percent ?? "0",
        bill_thank_you_message: s.bill_thank_you_message ?? "Thank you for your order!",
        bill_cta_text: s.bill_cta_text ?? "",
        bill_website: s.bill_website ?? "",
      });
    }
  }, [settings.data]);

  const toggleDarkMode = (on: boolean) => {
    setDarkMode(on);
    if (on) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const onUpdatePassword = (values: PinForm) => {
    if (!me.data?.id) return;
    updateUser.mutate(
      { id: me.data.id, data: { password: values.newPassword } },
      {
        onSuccess: () => {
          toast({ title: t("Password Updated") });
          pinForm.reset();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error || t("Failed to update password") });
        },
      }
    );
  };

  const onCreateUser = (values: UserForm) => {
    createUser.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: t("User Created") });
          qc.invalidateQueries({ queryKey: ["listUsers"] });
          setUserDialog(false);
          userForm.reset();
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error || t("Failed to create user") });
        },
      }
    );
  };

  const onSaveBillSettings = (values: BillSettingsForm) => {
    updateSettings.mutate(
      { data: values as any },
      {
        onSuccess: () => {
          toast({ title: t("Bill Settings Saved") });
          qc.invalidateQueries({ queryKey: getListSettingsQueryKey() });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: t("Error"), description: err?.data?.error || t("Failed to save settings") });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="page-settings">
      <h1 className="text-2xl font-bold">{t("Settings")}</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("General")}</TabsTrigger>
          <TabsTrigger value="security">{t("Security")}</TabsTrigger>
          {isOwner && <TabsTrigger value="bill">{t("Bill")}</TabsTrigger>}
          {isOwner && <TabsTrigger value="users">{t("Users")}</TabsTrigger>}
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Appearance")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <Label>{t("Dark Mode")}</Label>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} data-testid="switch-dark-mode" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  <Label>{t("Language")}</Label>
                </div>
                <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ur")}>
                  <SelectTrigger className="w-32" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("About")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Application")}</span>
                <span className="font-medium">MUFAZ Kitchen POS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Version")}</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Logged in as")}</span>
                <span className="font-medium">{me.data?.name} ({me.data?.role})</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Change Password")}</CardTitle>
              <CardDescription>{t("Update your account password")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...pinForm}>
                <form onSubmit={pinForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                  <FormField control={pinForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Current Password")}</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-current-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={pinForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("New Password")}</FormLabel>
                      <FormControl><Input type="password" {...field} data-testid="input-new-password" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={updateUser.isPending} data-testid="button-update-password">
                    {t("Update Password")}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bill Settings (owner only) */}
        {isOwner && (
          <TabsContent value="bill" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  {t("Bill / Invoice Settings")}
                </CardTitle>
                <CardDescription>{t("Customize the information shown on every receipt")}</CardDescription>
              </CardHeader>
              <CardContent>
                {settings.isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <Form {...billForm}>
                    <form onSubmit={billForm.handleSubmit(onSaveBillSettings)} className="space-y-4">
                      <div className="border-b pb-4 space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Business Info")}</p>
                        <FormField control={billForm.control} name="kitchen_name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Business Name")}</FormLabel>
                            <FormControl><Input {...field} data-testid="input-kitchen-name" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={billForm.control} name="kitchen_phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Phone")}</FormLabel>
                              <FormControl><Input {...field} data-testid="input-kitchen-phone" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={billForm.control} name="bill_website" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Website")}</FormLabel>
                              <FormControl><Input placeholder="www.example.com" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <FormField control={billForm.control} name="kitchen_address" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Address")}</FormLabel>
                            <FormControl><Input {...field} data-testid="input-kitchen-address" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <div className="border-b pb-4 space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Pricing")}</p>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField control={billForm.control} name="bill_discount_percent" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Discount")} %</FormLabel>
                              <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} data-testid="input-discount-percent" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={billForm.control} name="bill_tax_percent" render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("Tax")} %</FormLabel>
                              <FormControl><Input type="number" min="0" max="100" step="0.01" {...field} data-testid="input-tax-percent" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                        <p className="text-xs text-muted-foreground">{t("Applied automatically when generating a new bill")}</p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{t("Receipt Footer")}</p>
                        <FormField control={billForm.control} name="bill_thank_you_message" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("Thank-You Message")}</FormLabel>
                            <FormControl><Textarea rows={2} {...field} data-testid="input-thank-you-message" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={billForm.control} name="bill_cta_text" render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("CTA / Promo Text")}</FormLabel>
                            <FormControl><Textarea rows={2} placeholder={t("e.g. Order again on WhatsApp: +92-300-0000000")} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <Button type="submit" disabled={updateSettings.isPending} data-testid="button-save-bill-settings">
                        {t("Save Bill Settings")}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Users (owner only) */}
        {isOwner && (
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("Manage staff accounts")}</p>
              <Button size="sm" onClick={() => { userForm.reset(); setUserDialog(true); }} data-testid="button-add-user">
                <Plus className="w-4 h-4 mr-2" /> {t("Add User")}
              </Button>
            </div>
            {users.isLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : (
              <div className="space-y-2">
                {users.data?.map((u: any) => (
                  <Card key={u.id} data-testid={`card-user-${u.id}`}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                        <Badge variant={u.role === "owner" ? "default" : "outline"} className="text-xs">
                          {u.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Add user dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("Add User")}</DialogTitle></DialogHeader>
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onCreateUser)} className="space-y-4">
              <FormField control={userForm.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>{t("Name")}</FormLabel><FormControl><Input {...field} data-testid="input-user-name" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>{t("Email")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>{t("Password")}</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={userForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>{t("Role")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setUserDialog(false)}>{t("Cancel")}</Button>
                <Button type="submit" disabled={createUser.isPending} data-testid="button-save-user">{t("Create")}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
