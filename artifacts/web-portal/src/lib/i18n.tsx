import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ur";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, { en: string; ur: string }> = {
  "Dashboard": { en: "Dashboard", ur: "ڈیش بورڈ" },
  "Orders": { en: "Orders", ur: "آرڈرز" },
  "New Order": { en: "New Order", ur: "نیا آرڈر" },
  "Menu": { en: "Menu", ur: "مینو" },
  "Customers": { en: "Customers", ur: "کسٹمرز" },
  "Inventory": { en: "Inventory", ur: "انوینٹری" },
  "Recipes": { en: "Recipes", ur: "تراکیب" },
  "Scheduled": { en: "Scheduled", ur: "شیڈولڈ" },
  "Bills": { en: "Bills", ur: "بلز" },
  "Reports": { en: "Reports", ur: "رپورٹس" },
  "Settings": { en: "Settings", ur: "ترتیبات" },
  "Login": { en: "Login", ur: "لاگ ان" },
  "Email": { en: "Email", ur: "ای میل" },
  "Password": { en: "Password", ur: "پاس ورڈ" },
  "Sign In": { en: "Sign In", ur: "سائن ان کریں" },
  "Logout": { en: "Logout", ur: "لاگ آؤٹ" },
  "Today's Summary": { en: "Today's Summary", ur: "آج کا خلاصہ" },
  "Revenue": { en: "Revenue", ur: "آمدنی" },
  "Active Orders": { en: "Active Orders", ur: "فعال آرڈرز" },
  "Low Stock Alerts": { en: "Low Stock Alerts", ur: "کم اسٹاک الرٹس" },
  "Pending": { en: "Pending", ur: "زیر التواء" },
  "Confirmed": { en: "Confirmed", ur: "تصدیق شدہ" },
  "Preparing": { en: "Preparing", ur: "تیاری میں" },
  "Ready": { en: "Ready", ur: "تیار" },
  "Delivered": { en: "Delivered", ur: "پہنچا دیا گیا" },
  "Cancelled": { en: "Cancelled", ur: "منسوخ" },
  "Save": { en: "Save", ur: "محفوظ کریں" },
  "Cancel": { en: "Cancel", ur: "منسوخ کریں" },
  "Edit": { en: "Edit", ur: "ترمیم کریں" },
  "Delete": { en: "Delete", ur: "حذف کریں" },
  "Create": { en: "Create", ur: "بنائیں" },
  "Update": { en: "Update", ur: "اپ ڈیٹ کریں" },
  "Search": { en: "Search", ur: "تلاش کریں" },
  "Actions": { en: "Actions", ur: "ایکشنز" },
  "Status": { en: "Status", ur: "حیثیت" },
  "Total": { en: "Total", ur: "کل" },
  "Items": { en: "Items", ur: "آئٹمز" },
  "Payment Method": { en: "Payment Method", ur: "ادائیگی کا طریقہ" },
  "Order Type": { en: "Order Type", ur: "آرڈر کی قسم" },
  "Dine-in": { en: "Dine-in", ur: "ڈائن ان" },
  "Takeaway": { en: "Takeaway", ur: "ٹیک اوے" },
  "Delivery": { en: "Delivery", ur: "ڈیلیوری" },
  "Cash": { en: "Cash", ur: "نقد" },
  "JazzCash": { en: "JazzCash", ur: "جیز کیش" },
  "EasyPaisa": { en: "EasyPaisa", ur: "ایزی پیسہ" },
  "Name": { en: "Name", ur: "نام" },
  "Phone": { en: "Phone", ur: "فون" },
  "Address": { en: "Address", ur: "پتہ" },
  "Notes": { en: "Notes", ur: "نوٹس" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("mufaz_lang") as Language;
    if (savedLang && (savedLang === "en" || savedLang === "ur")) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("mufaz_lang", lang);
    if (lang === "ur") {
      document.documentElement.dir = "rtl";
      document.documentElement.classList.add("font-urdu");
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.classList.remove("font-urdu");
    }
  };

  const t = (key: string) => {
    if (translations[key]) {
      return translations[key][language] || key;
    }
    return key;
  };

  // Set initial dir
  useEffect(() => {
    if (language === "ur") {
      document.documentElement.dir = "rtl";
      document.documentElement.classList.add("font-urdu");
    } else {
      document.documentElement.dir = "ltr";
      document.documentElement.classList.remove("font-urdu");
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
