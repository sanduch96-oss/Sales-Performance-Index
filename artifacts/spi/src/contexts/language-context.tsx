import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Language = "ro" | "ru" | "en";

const translations = {
  ro: {
    nav: {
      dashboard: "Dashboard",
      specialists: "Specialiști",
      evaluations: "Evaluări",
      reports: "Rapoarte",
      settings: "Setări",
      logout: "Deconectare",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Privire de ansamblu asupra performanței echipei.",
      totalEvals: "Total evaluări",
      avgScore: "Scor mediu echipă",
      weakestSection: "Etapa cea mai slabă",
      bestSection: "Etapa cea mai bună",
      monthlyTrend: "Evoluție lunară",
      recentEvals: "Evaluări recente",
      sectionPerformance: "Performanța pe compartimente",
      noData: "Nu există date suficiente.",
      noRecent: "Nu există evaluări recente.",
      monthlyProgress: "Progres lunar",
      target: "Țintă",
      evalsPerMonth: "evaluări/lună",
      from: "De la",
      to: "Până la",
    },
    specialists: {
      title: "Specialiști",
      subtitle: "Gestionați echipa de specialiști.",
      add: "Adaugă specialist",
      archive: "Arhivat",
      archived: "Arhivați",
      active: "Activi",
      noSpecialists: "Nu există specialiști.",
      profile: "Profil",
      evaluate: "Evaluează",
    },
    evaluations: {
      title: "Evaluări",
      subtitle: "Lista tuturor evaluărilor realizate în sistem.",
      new: "Evaluare nouă",
      specialist: "Specialist",
      dateTime: "Data & Ora",
      client: "Client",
      type: "Tip",
      status: "Status",
      score: "Scor",
      view: "Vezi",
      edit: "Editează",
      delete: "Șterge",
      finalized: "Finalizat",
      draft: "Draft",
      noEvals: "Nu s-au găsit evaluări.",
      search: "Caută după specialist sau client...",
      deleteConfirm: "Șterge evaluarea?",
      deleteDesc: "Această acțiune este ireversibilă. Evaluarea draft va fi ștearsă definitiv.",
      cancel: "Anulare",
    },
    settings: {
      title: "Setări",
      subtitle: "Configurați aplicația.",
      criteria: "Editează criterii",
      criteriaDesc: "Gestionați compartimentele și criteriile de evaluare.",
      language: "Limbă interfață",
      languageDesc: "Selectați limba pentru interfața aplicației.",
      addSection: "Compartiment nou",
      sectionName: "Denumire compartiment",
      addCriterion: "Criteriu nou",
      criterionName: "Denumire criteriu",
      weight: "Pontaj",
      save: "Salvează",
      deleteSection: "Șterge compartimentul",
      deleteSectionDesc: "Se vor șterge și toate criteriile din acest compartiment.",
      deleteCriterion: "Șterge criteriul?",
      totalWeight: "Pontaj total",
      rename: "Redenumire",
    },
    common: {
      save: "Salvează",
      cancel: "Anulare",
      delete: "Șterge",
      edit: "Editează",
      add: "Adaugă",
      loading: "Se încarcă...",
      noData: "Nu există date.",
      confirm: "Confirmă",
    },
  },
  ru: {
    nav: {
      dashboard: "Дашборд",
      specialists: "Специалисты",
      evaluations: "Оценки",
      reports: "Отчёты",
      settings: "Настройки",
      logout: "Выйти",
    },
    dashboard: {
      title: "Дашборд",
      subtitle: "Обзор показателей команды.",
      totalEvals: "Всего оценок",
      avgScore: "Средний балл команды",
      weakestSection: "Слабейший этап",
      bestSection: "Лучший этап",
      monthlyTrend: "Ежемесячная динамика",
      recentEvals: "Последние оценки",
      sectionPerformance: "Результаты по разделам",
      noData: "Недостаточно данных.",
      noRecent: "Последних оценок нет.",
      monthlyProgress: "Прогресс за месяц",
      target: "Цель",
      evalsPerMonth: "оценок/месяц",
      from: "С",
      to: "По",
    },
    specialists: {
      title: "Специалисты",
      subtitle: "Управляйте командой специалистов.",
      add: "Добавить специалиста",
      archive: "В архиве",
      archived: "Архивные",
      active: "Активные",
      noSpecialists: "Специалисты не найдены.",
      profile: "Профиль",
      evaluate: "Оценить",
    },
    evaluations: {
      title: "Оценки",
      subtitle: "Список всех оценок в системе.",
      new: "Новая оценка",
      specialist: "Специалист",
      dateTime: "Дата и время",
      client: "Клиент",
      type: "Тип",
      status: "Статус",
      score: "Балл",
      view: "Просмотр",
      edit: "Изменить",
      delete: "Удалить",
      finalized: "Завершено",
      draft: "Черновик",
      noEvals: "Оценки не найдены.",
      search: "Поиск по специалисту или клиенту...",
      deleteConfirm: "Удалить оценку?",
      deleteDesc: "Это действие необратимо. Черновик оценки будет удалён.",
      cancel: "Отмена",
    },
    settings: {
      title: "Настройки",
      subtitle: "Настройка приложения.",
      criteria: "Редактировать критерии",
      criteriaDesc: "Управляйте разделами и критериями оценки.",
      language: "Язык интерфейса",
      languageDesc: "Выберите язык интерфейса приложения.",
      addSection: "Новый раздел",
      sectionName: "Название раздела",
      addCriterion: "Новый критерий",
      criterionName: "Название критерия",
      weight: "Вес",
      save: "Сохранить",
      deleteSection: "Удалить раздел",
      deleteSectionDesc: "Все критерии этого раздела также будут удалены.",
      deleteCriterion: "Удалить критерий?",
      totalWeight: "Общий вес",
      rename: "Переименовать",
    },
    common: {
      save: "Сохранить",
      cancel: "Отмена",
      delete: "Удалить",
      edit: "Изменить",
      add: "Добавить",
      loading: "Загрузка...",
      noData: "Нет данных.",
      confirm: "Подтвердить",
    },
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      specialists: "Specialists",
      evaluations: "Evaluations",
      reports: "Reports",
      settings: "Settings",
      logout: "Logout",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Overview of team performance.",
      totalEvals: "Total evaluations",
      avgScore: "Team average score",
      weakestSection: "Weakest stage",
      bestSection: "Best stage",
      monthlyTrend: "Monthly trend",
      recentEvals: "Recent evaluations",
      sectionPerformance: "Performance by section",
      noData: "Not enough data.",
      noRecent: "No recent evaluations.",
      monthlyProgress: "Monthly progress",
      target: "Target",
      evalsPerMonth: "evals/month",
      from: "From",
      to: "To",
    },
    specialists: {
      title: "Specialists",
      subtitle: "Manage your team of specialists.",
      add: "Add specialist",
      archive: "Archived",
      archived: "Archived",
      active: "Active",
      noSpecialists: "No specialists found.",
      profile: "Profile",
      evaluate: "Evaluate",
    },
    evaluations: {
      title: "Evaluations",
      subtitle: "List of all evaluations in the system.",
      new: "New evaluation",
      specialist: "Specialist",
      dateTime: "Date & Time",
      client: "Client",
      type: "Type",
      status: "Status",
      score: "Score",
      view: "View",
      edit: "Edit",
      delete: "Delete",
      finalized: "Finalized",
      draft: "Draft",
      noEvals: "No evaluations found.",
      search: "Search by specialist or client...",
      deleteConfirm: "Delete evaluation?",
      deleteDesc: "This action is irreversible. The draft evaluation will be permanently deleted.",
      cancel: "Cancel",
    },
    settings: {
      title: "Settings",
      subtitle: "Configure the application.",
      criteria: "Edit criteria",
      criteriaDesc: "Manage sections and evaluation criteria.",
      language: "Interface language",
      languageDesc: "Select the language for the application interface.",
      addSection: "New section",
      sectionName: "Section name",
      addCriterion: "New criterion",
      criterionName: "Criterion name",
      weight: "Weight",
      save: "Save",
      deleteSection: "Delete section",
      deleteSectionDesc: "All criteria in this section will also be deleted.",
      deleteCriterion: "Delete criterion?",
      totalWeight: "Total weight",
      rename: "Rename",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      loading: "Loading...",
      noData: "No data.",
      confirm: "Confirm",
    },
  },
} as const;

type Translations = typeof translations.ro;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANGUAGE_KEY = "spi_language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return (saved as Language) || "ro";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = translations[language] as Translations;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
