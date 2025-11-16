'use client'

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";

// --- 環境変数とFirebaseの初期化 ---
const appId =
  typeof __app_id !== "undefined" ? __app_id : "health-pro-v3-default";
const firebaseConfig =
  typeof __firebase_config !== "undefined" ? JSON.parse(__firebase_config) : {};
const initialAuthToken =
  typeof __initial_auth_token !== "undefined" ? __initial_auth_token : null;

let db, auth;
if (Object.keys(firebaseConfig).length) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

// --- 定数とダミーデータ ---
const DAILY_GOALS = {
  protein: 120,
  iron: 10,
  calcium: 600,
  sodium: 1500,
  sugar: 50,
};
const NUTRIENT_UNITS = {
  protein: "g",
  iron: "mg",
  calcium: "mg",
  sodium: "mg",
  sugar: "g",
};

// ユーザーが避けるべき食品/成分のリスト
const USER_PROHIBITIONS = [
  { type: "additive", value: "着色料" },
  { type: "nutrient", value: "sugar", threshold: 40 },
];

// 食事レシピダミーデータ (advParamsは将来のAI解析用)
const DUMMY_RECIPES = [
  {
    id: "r1",
    name: "高タンパク鶏むね肉グリル (国産)",
    nutrients: { protein: 45, iron: 2, calcium: 50, sodium: 300, sugar: 5 },
    advParams: { hasAdditives: "なし", foodPairing: "ブロッコリー" },
  },
  {
    id: "r3",
    name: "輸入フルーツの砂糖漬けヨーグルト",
    nutrients: { protein: 15, iron: 0.5, calcium: 250, sodium: 50, sugar: 65 }, // 砂糖が高いため警告対象
    advParams: { hasAdditives: "着色料", foodPairing: "なし" },
  },
  {
    id: "r4",
    name: "有機野菜とツナのサラダ",
    nutrients: { protein: 20, iron: 1, calcium: 30, sodium: 200, sugar: 5 },
    advParams: { hasAdditives: "なし", foodPairing: "穀物" },
  },
];

// 運動メニューの種類
const EXERCISE_TYPES = [
  {
    id: "e1",
    name: "🧘 ヨガ (30分)",
    target: "柔軟性・リラックス",
    calories: 150,
  },
  {
    id: "e2",
    name: "🚶 散歩 (40分/有酸素)",
    target: "有酸素運動・習慣",
    calories: 200,
  },
  {
    id: "e3",
    name: "🏃 HIIT (30分/高負荷)",
    target: "脂肪燃焼",
    calories: 400,
  },
  {
    id: "e4",
    name: "💪 筋トレ (全身)",
    target: "筋力UP・基礎代謝",
    calories: 300,
  },
  { id: "e5", name: "🍎 ダイエット目標設定", target: "習慣化", calories: 0 },
];

// ユーザーの身体データ（体脂肪率を基にしたメニュー提案のモック）
const DUMMY_USER_STATS = { bodyFat: 28, targetBodyFat: 20 };

const HEALTH_RISKS = [
  {
    name: "高血圧リスク",
    targetNutrient: "sodium",
    prevention: "減塩、有酸素運動",
    medical: "血圧・ナトリウム値検査",
  },
  {
    name: "高血糖リスク",
    targetNutrient: "sugar",
    prevention: "食後15分歩行、クロム摂取",
    medical: "HbA1c、血糖値検査",
  },
];

// --- ヘルパー関数 ---
const formatDate = (date) => date.toISOString().split("T")[0];
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日を週の始まりとする
  return new Date(d.setDate(diff));
};
const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = getWeekStart(firstDay);
  const days = [];
  let current = new Date(startDay);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};
const getDaysInWeek = (date) => {
  const startOfWeek = getWeekStart(date);
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
};

// 体脂肪率に基づいたパーソナライズメニュー提案ロジック（モック）
const getRecommendedExercise = (date) => {
  const day = date.getDay(); // 0: 日, 1: 月, ...
  const bodyFat = DUMMY_USER_STATS.bodyFat;

  if (bodyFat >= 25) {
    if (day % 3 === 1)
      return {
        recipeId: "e3",
        time: "朝",
        description: "体脂肪燃焼のため、HIITを優先",
      };
    if (day % 3 === 2)
      return {
        recipeId: "e4",
        time: "夜",
        description: "基礎代謝アップのため、筋トレを優先",
      };
    return {
      recipeId: "e2",
      time: "夕",
      description: "軽い有酸素運動で継続性を重視",
    };
  } else {
    if (day % 2 === 0)
      return {
        recipeId: "e1",
        time: "朝",
        description: "柔軟性とリラックスを重視",
      };
    return {
      recipeId: "e4",
      time: "夜",
      description: "シェイプアップのため筋トレ",
    };
  }
};

// --- UIコンポーネント: アラートモーダル ---
const CustomAlert = ({ message, onClose }) => (
  <div className="fixed top-0 left-0 right-0 z-50 p-4">
    <div className="max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg flex justify-between items-center">
      <p className="font-bold">🚨 警告: 献立に注意が必要です</p>
      <p className="text-sm ml-4">{message}</p>
      <button
        onClick={onClose}
        className="ml-4 text-red-500 hover:text-red-800 font-bold"
      >
        &times;
      </button>
    </div>
  </div>
);

// --- UIコンポーネント: 予防対策ダッシュボード (別タブ) ---
const PreventionView = () => (
  <div className="p-8 bg-white rounded-xl shadow-inner min-h-[70vh]">
    <h2 className="text-3xl font-bold text-indigo-700 mb-6 border-b pb-3">
      予防対策統合ダッシュボード
    </h2>
    <p className="text-gray-600 mb-8">
      あなたの健康リスクに基づき、栄養、運動、医療の側面から統合的な予防策を提案します。
    </p>

    <div className="space-y-8">
      {HEALTH_RISKS.map((risk, index) => (
        <div
          key={index}
          className="p-5 border border-red-300 bg-red-50 rounded-lg shadow-md hover:shadow-xl transition duration-300"
        >
          <h3 className="text-xl font-bold text-red-700 mb-3 flex items-center">
            <span className="text-2xl mr-2">🎯</span> {risk.name}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-yellow-100 p-3 rounded-md">
              <p className="font-semibold text-gray-800 border-b pb-1 mb-1">
                栄養による予防
              </p>
              <p className="text-gray-600">
                制限/強化栄養素: **{risk.targetNutrient}** を厳しく管理します。
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-md">
              <p className="font-semibold text-gray-800 border-b pb-1 mb-1">
                運動/生活対策
              </p>
              <p className="text-gray-600">
                実行すべき対策: **{risk.prevention}**
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-md">
              <p className="font-semibold text-gray-800 border-b pb-1 mb-1">
                医療対策
              </p>
              <p className="text-gray-600">推奨健康診断: **{risk.medical}**</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// --- メインアプリケーションコンポーネント ---
const App = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [menuPlans, setMenuPlans] = useState([]); // 食事データ
  const [exercisePlans, setExercisePlans] = useState([]); // 運動データ
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [currentPage, setCurrentPage] = useState("calendar"); // 'calendar', 'exercise', 'prevention'
  const [showAlert, setShowAlert] = useState(null);

  // --- Firebase認証と初期化 ---
  useEffect(() => {
    if (!auth || !db) {
      setIsAuthReady(true);
      return;
    }

    const initializeAuth = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error:", error);
      }
    };
    initializeAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(crypto.randomUUID());
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // --- Firestoreデータ購読 (食事) ---
  useEffect(() => {
    if (!db || !userId) return;

    const menuRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "menu_plans"
    );
    const unsubMenu = onSnapshot(
      menuRef,
      (snapshot) => {
        const plans = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMenuPlans(plans);
      },
      (error) => console.error("Menu Plans Snapshot Error:", error)
    );

    return () => unsubMenu();
  }, [userId]);

  // --- Firestoreデータ購読 (運動) ---
  useEffect(() => {
    if (!db || !userId) return;

    const exerciseRef = collection(
      db,
      "artifacts",
      appId,
      "users",
      userId,
      "exercise_plans"
    );
    const unsubExercise = onSnapshot(
      exerciseRef,
      (snapshot) => {
        const plans = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExercisePlans(plans);
      },
      (error) => console.error("Exercise Plans Snapshot Error:", error)
    );

    return () => unsubExercise();
  }, [userId]);

  // --- 食事データ操作ロジック ---

  // 禁止事項チェック
  const checkProhibitions = useCallback((recipe) => {
    let warning = null;
    USER_PROHIBITIONS.forEach((prohibition) => {
      if (
        prohibition.type === "additive" &&
        recipe.advParams.hasAdditives === prohibition.value
      ) {
        warning = `${recipe.name} には避けるべき添加物 (${prohibition.value}) が含まれています。`;
      } else if (
        prohibition.type === "nutrient" &&
        recipe.nutrients[prohibition.value] > prohibition.threshold
      ) {
        warning = `${recipe.name} は${prohibition.value}が${
          prohibition.threshold
        }${NUTRIENT_UNITS[prohibition.value]}を超えています。`;
      }
    });
    return warning;
  }, []);

  // 献立の追加
  const handleAddMeal = useCallback(
    async (dateStr, recipeId) => {
      if (!userId || !db) return;
      const recipe = DUMMY_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) return;

      const warning = checkProhibitions(recipe);
      if (warning) {
        setShowAlert(warning);
      }

      const newMeal = {
        date: dateStr,
        recipeName: recipe.name,
        nutrients: recipe.nutrients,
        advParams: recipe.advParams,
        isCompleted: false,
        timestamp: Date.now(),
      };
      try {
        await addDoc(
          collection(db, "artifacts", appId, "users", userId, "menu_plans"),
          newMeal
        );
      } catch (e) {
        console.error("献立追加エラー:", e);
      }
    },
    [userId, checkProhibitions]
  );

  // 摂取実績のトグルと食後対策の提案
  const handleToggleIntake = useCallback(
    async (mealId) => {
      if (!userId || !db) return;
      const meal = menuPlans.find((m) => m.id === mealId);
      if (!meal) return;

      const mealRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        userId,
        "menu_plans",
        mealId
      );
      try {
        await updateDoc(mealRef, { isCompleted: !meal.isCompleted });

        if (!meal.isCompleted) {
          console.log(
            `【食後対策の実行】摂取完了！${meal.recipeName}に含まれる糖質対策のため、15分間の軽めの運動を実行しましょう。`
          );
        }
      } catch (e) {
        console.error("摂取実績更新エラー:", e);
      }
    },
    [userId, menuPlans]
  );

  // 特定日の栄養摂取量の計算 (実績のみ)
  const calculateDailyIntake = useCallback(
    (dateStr) => {
      const dailyMeals = menuPlans.filter(
        (p) => p.date === dateStr && p.isCompleted
      );
      const intake = {};
      Object.keys(DAILY_GOALS).forEach((nut) => (intake[nut] = 0));

      dailyMeals.forEach((meal) => {
        Object.keys(meal.nutrients).forEach((nut) => {
          intake[nut] = (intake[nut] || 0) + meal.nutrients[nut];
        });
      });
      return intake;
    },
    [menuPlans]
  );

  // 目標達成度の計算
  const checkGoalAchievement = useCallback(
    (date) => {
      const dateStr = formatDate(date);
      const intake = calculateDailyIntake(dateStr);
      const deficiencies = {};
      let allAchieved = true;

      Object.keys(DAILY_GOALS).forEach((nut) => {
        const goal = DAILY_GOALS[nut];
        const current = intake[nut] || 0;
        const shortfall = goal - current;
        if (shortfall > 0) {
          deficiencies[nut] = shortfall;
          allAchieved = false;
        }
      });

      return { allAchieved, deficiencies };
    },
    [calculateDailyIntake]
  );

  // 翌日の献立調整ロジック（モック）
  const handleAdjustNextDay = useCallback(
    async (date) => {
      const yesterday = new Date(date);
      yesterday.setDate(date.getDate() - 1);
      const { deficiencies } = checkGoalAchievement(yesterday);

      if (Object.keys(deficiencies).length === 0) {
        alert("昨日の栄養目標はすべて達成されています！");
        return;
      }

      const nextDayStr = formatDate(date);
      let adjustments = 0;

      // 不足栄養素を補う献立を追加
      Object.keys(deficiencies).forEach((nut) => {
        if (deficiencies[nut] > DAILY_GOALS[nut] * 0.2) {
          const recommendedRecipe = DUMMY_RECIPES.find(
            (r) => r.nutrients[nut] > 30
          );
          if (recommendedRecipe) {
            handleAddMeal(nextDayStr, recommendedRecipe.id);
            adjustments++;
          }
        }
      });

      if (adjustments > 0) {
        alert(
          `${formatDate(
            yesterday
          )}の不足に基づき、${nextDayStr}の献立に${adjustments}件の調整案を追加しました。`
        );
      } else {
        alert("調整が必要なほどの大きな栄養素不足はありませんでした。");
      }
    },
    [handleAddMeal, checkGoalAchievement]
  );

  // --- 運動データ操作ロジック ---

  // 運動メニューの追加
  const handleAddExercise = useCallback(
    async (dateStr, exerciseId, isRecommended = false) => {
      if (!userId || !db) return;
      const exercise = EXERCISE_TYPES.find((e) => e.id === exerciseId);
      if (!exercise) return;

      const newExercise = {
        date: dateStr,
        exerciseName: exercise.name,
        target: exercise.target,
        isCompleted: false,
        isRecommended: isRecommended,
        timestamp: Date.now(),
      };
      try {
        await addDoc(
          collection(db, "artifacts", appId, "users", userId, "exercise_plans"),
          newExercise
        );
      } catch (e) {
        console.error("運動追加エラー:", e);
      }
    },
    [userId]
  );

  // 運動実績のトグル
  const handleToggleExercise = useCallback(
    async (exerciseId) => {
      if (!userId || !db) return;
      const exercise = exercisePlans.find((e) => e.id === exerciseId);
      if (!exercise) return;

      const exerciseRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        userId,
        "exercise_plans",
        exerciseId
      );
      try {
        await updateDoc(exerciseRef, { isCompleted: !exercise.isCompleted });
      } catch (e) {
        console.error("運動実績更新エラー:", e);
      }
    },
    [userId, exercisePlans]
  );

  // 運動の削除
  const handleDeleteItem = useCallback(
    async (itemId, type) => {
      if (!userId || !db) return;
      const collectionName = type === "menu" ? "menu_plans" : "exercise_plans";
      try {
        await deleteDoc(
          doc(db, "artifacts", appId, "users", userId, collectionName, itemId)
        );
      } catch (e) {
        console.error("データ削除エラー:", e);
      }
    },
    [userId]
  );

  // --- カレンダー共通ロジック ---

  // 期間の変更
  const changePeriod = (amount) => {
    const newDate = new Date(currentDate);
    if (calendarView === "month") {
      newDate.setMonth(newDate.getMonth() + amount);
    } else {
      newDate.setDate(newDate.getDate() + amount * 7);
    }
    setCurrentDate(newDate);
  };

  // 栄養達成度のバッジコンポーネント (食事用)
  const GoalBadge = ({ date }) => {
    const { allAchieved, deficiencies } = checkGoalAchievement(date);
    if (formatDate(date) === formatDate(new Date())) return null;

    if (allAchieved) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
          ✅ 達成
        </span>
      );
    }

    if (Object.keys(deficiencies).length > 0) {
      return (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 cursor-help"
          title={`不足: ${Object.keys(deficiencies)
            .map(
              (n) => `${n}:${deficiencies[n].toFixed(0)}${NUTRIENT_UNITS[n]}`
            )
            .join(", ")}`}
        >
          ⚠️ 不足
        </span>
      );
    }
    return null;
  };

  // 運動達成度のバッジコンポーネント
  const ExerciseBadge = ({ date }) => {
    const dateStr = formatDate(date);
    const dayExercises = exercisePlans.filter((e) => e.date === dateStr);
    const completed = dayExercises.filter((e) => e.isCompleted).length;
    const total = dayExercises.length;

    if (formatDate(date) === formatDate(new Date())) return null;

    if (total === 0) return null;

    if (completed === total) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          🏆 完了
        </span>
      );
    }

    if (completed > 0 && completed < total) {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
          {completed}/{total} 進行中
        </span>
      );
    }

    return null;
  };

  // --- UIコンポーネント: 共通カレンダー構造 ---
  const BaseCalendar = ({
    data,
    onAddItem,
    onToggleItem,
    onDeleteItem,
    ItemComponent,
    Recommender,
    title,
    collectionType,
    BadgeComponent,
    syncMock,
  }) => {
    const calendarDays =
      calendarView === "month"
        ? getDaysInMonth(currentDate)
        : getDaysInWeek(currentDate);

    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>

          <div className="flex space-x-3 items-center">
            <button
              className="bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition shadow-md text-sm"
              onClick={() => console.log(syncMock)}
            >
              <span className="mr-2">📅</span> Googleカレンダーと同期
            </button>
            <button
              onClick={() =>
                setCalendarView(calendarView === "month" ? "week" : "month")
              }
              className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium text-sm"
            >
              {calendarView === "month"
                ? "週表示に切り替え"
                : "月表示に切り替え"}
            </button>
            <div className="flex space-x-1">
              <button
                onClick={() => changePeriod(-1)}
                className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={() => changePeriod(1)}
                className="p-2 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* カレンダー本体 */}
        <div
          className={`grid ${
            calendarView === "month" ? "grid-cols-7" : "grid-cols-7"
          }`}
        >
          {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-sm py-2 text-gray-600 bg-gray-100 border-b"
            >
              {day}
            </div>
          ))}

          {calendarDays.map((date, index) => {
            const dateStr = formatDate(date);
            const isToday = dateStr === formatDate(new Date());
            const isCurrentMonth =
              calendarView === "month"
                ? date.getMonth() === currentDate.getMonth()
                : true;
            const dayItems = data.filter((item) => item.date === dateStr);

            return (
              <div
                key={index}
                className={`
                      p-2 border border-gray-200 overflow-y-auto transition relative
                      ${
                        calendarView === "month"
                          ? "min-h-[140px]"
                          : "min-h-[280px]"
                      }
                      ${
                        isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400"
                      }
                      ${
                        isToday
                          ? "border-2 border-indigo-500 bg-indigo-50 shadow-inner"
                          : ""
                      }
                    `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-lg font-bold ${
                      isToday ? "text-indigo-700" : "text-gray-800"
                    }`}
                  >
                    {date.getDate()}
                  </span>

                  <div className="flex flex-col items-end space-y-1">
                    {BadgeComponent && <BadgeComponent date={date} />}
                    {Recommender && (
                      <Recommender
                        date={date}
                        onAdd={onAddItem}
                        dayItems={dayItems}
                      />
                    )}
                  </div>
                </div>

                {/* アイテムの表示 */}
                <div className="space-y-1">
                  {dayItems.map((item) => (
                    <ItemComponent
                      key={item.id}
                      item={item}
                      onToggle={onToggleItem}
                      onDelete={() => onDeleteItem(item.id, collectionType)}
                    />
                  ))}
                </div>

                {/* アイテム追加ボタン (簡略版) */}
                <div className="mt-2 absolute bottom-2 left-2 right-2">
                  <select
                    onChange={(e) => onAddItem(dateStr, e.target.value)}
                    className="text-xs p-1 border-none bg-indigo-100 rounded w-full cursor-pointer text-indigo-700 font-medium"
                    value=""
                  >
                    <option value="" disabled>
                      + {collectionType === "menu" ? "献立" : "運動"}を追加...
                    </option>
                    {(collectionType === "menu"
                      ? DUMMY_RECIPES
                      : EXERCISE_TYPES
                    ).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 食事関連コンポーネント ---
  const MealItem = ({ item, onToggle, onDelete }) => (
    <div className="bg-gray-100 p-2 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-gray-800 leading-tight">
          {item.recipeName}
        </p>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 p-0.5 rounded-full transition"
          title="削除"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm7 1a1 1 0 00-2 0v6a1 1 0 102 0V9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="flex justify-between items-center mt-1">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={item.isCompleted}
            onChange={() => onToggle(item.id)}
            className="h-4 w-4 text-green-600 form-checkbox rounded border-gray-300 focus:ring-green-500"
          />
          <span
            className={`ml-2 text-xs ${
              item.isCompleted ? "line-through text-gray-400" : "text-gray-700"
            }`}
          >
            摂取完了
          </span>
        </label>
        {item.isCompleted && (
          <button
            onClick={() =>
              console.log(
                `食後対策: 摂取した${item.recipeName}の対策として食後運動を実行`
              )
            }
            className="text-xs bg-teal-500 text-white px-2 py-0.5 rounded-full hover:bg-teal-600 transition"
            title="食後の血糖値スパイク対策などを実行"
          >
            食後対策実行
          </button>
        )}
      </div>
    </div>
  );

  // --- 運動関連コンポーネント ---
  const ExerciseItem = ({ item, onToggle, onDelete }) => (
    <div
      className={`p-2 rounded-lg shadow-sm border ${
        item.isRecommended
          ? "bg-yellow-100 border-yellow-300"
          : "bg-blue-100 border-blue-300"
      }`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-gray-800 leading-tight">
          {item.exerciseName}
          {item.isRecommended && (
            <span className="text-xs bg-yellow-400 text-gray-800 px-1 ml-1 rounded-full font-bold">
              推奨
            </span>
          )}
        </p>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-600 p-0.5 rounded-full transition"
          title="削除"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011 1v6a1 1 0 11-2 0V9a1 1 0 011-1zm7 1a1 1 0 00-2 0v6a1 1 0 102 0V9z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      <div className="flex justify-between items-center mt-1">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={item.isCompleted}
            onChange={() => onToggle(item.id)}
            className="h-4 w-4 text-teal-600 form-checkbox rounded border-gray-300 focus:ring-teal-500"
          />
          <span
            className={`ml-2 text-xs ${
              item.isCompleted ? "line-through text-gray-400" : "text-gray-700"
            }`}
          >
            実行完了
          </span>
        </label>
        <span className="text-xs text-gray-600 font-medium">{item.target}</span>
      </div>
    </div>
  );

  // 運動メニュー提案コンポーネント (Recommendation)
  const ExerciseRecommender = ({ date, onAdd, dayItems }) => {
    const isTodayOrFuture = date >= new Date().setHours(0, 0, 0, 0);
    const recommended = getRecommendedExercise(date);
    const hasRecommendation = dayItems.some((item) => item.isRecommended);

    if (isTodayOrFuture && !hasRecommendation) {
      return (
        <button
          onClick={() => onAdd(formatDate(date), recommended.recipeId, true)}
          className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full hover:bg-green-600 transition font-medium"
          title={`体脂肪率(${DUMMY_USER_STATS.bodyFat}%)に基づいた本日の推奨メニューを追加`}
        >
          本日のおすすめ追加
        </button>
      );
    }
    return null;
  };

  // --- カレンダービューのレンダリング ---
  const MealCalendarView = () => (
    <BaseCalendar
      data={menuPlans}
      onAddItem={handleAddMeal}
      onToggleItem={handleToggleIntake}
      onDeleteItem={handleDeleteItem}
      ItemComponent={MealItem}
      Recommender={({ date }) => {
        // 翌日調整ボタン (食事)
        const nextDay = new Date(new Date().getTime() + 86400000);
        if (formatDate(date) === formatDate(nextDay)) {
          return (
            <button
              onClick={() => handleAdjustNextDay(date)}
              className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full hover:bg-orange-600 transition font-medium"
              title="前日の不足栄養素を補う献立を自動で追加します"
            >
              翌日調整
            </button>
          );
        }
        return null;
      }}
      title="献立カレンダー (食事)"
      collectionType="menu"
      BadgeComponent={GoalBadge}
      syncMock="Googleカレンダー同期: 献立予定を同期するAPIを呼び出します"
    />
  );

  const ExerciseCalendarView = () => (
    <BaseCalendar
      data={exercisePlans}
      onAddItem={handleAddExercise}
      onToggleItem={handleToggleExercise}
      onDeleteItem={handleDeleteItem}
      ItemComponent={ExerciseItem}
      Recommender={ExerciseRecommender}
      title="運動カレンダー (習慣化)"
      collectionType="exercise"
      BadgeComponent={ExerciseBadge}
      syncMock="Googleカレンダー同期: 運動予定を同期するAPIを呼び出します"
    />
  );

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl text-indigo-600">認証中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* 禁止事項アラート */}
      {showAlert && (
        <CustomAlert message={showAlert} onClose={() => setShowAlert(null)} />
      )}

      {/* ヘッダーとナビゲーション */}
      <header className="bg-white shadow-md">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-extrabold text-indigo-700">
            統合予防医療プラットフォーム
          </h1>
          <nav className="flex space-x-3">
            <button
              onClick={() => setCurrentPage("calendar")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                currentPage === "calendar"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              献立カレンダー
            </button>
            <button
              onClick={() => setCurrentPage("exercise")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                currentPage === "exercise"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              運動カレンダー
            </button>
            <button
              onClick={() => setCurrentPage("prevention")}
              className={`px-4 py-2 rounded-full font-medium transition ${
                currentPage === "prevention"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              予防対策ダッシュボード
            </button>
          </nav>
          <div className="text-sm text-gray-500">
            ユーザーID:{" "}
            <span className="font-mono text-xs bg-gray-100 p-1 rounded">
              {userId}
            </span>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-screen-2xl mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {currentPage === "calendar" && <MealCalendarView />}
          {currentPage === "exercise" && <ExerciseCalendarView />}
          {currentPage === "prevention" && <PreventionView />}
        </div>
      </main>

      {/* フッター */}
      <footer className="py-4 text-center text-xs text-gray-400">
        ※本システムは、高度な予防医療AIとデータ蓄積を想定したUI/UXです。
      </footer>
    </div>
  );
};

export default App;
