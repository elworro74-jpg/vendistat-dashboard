import Chart from "chart.js/auto";
import { supabase } from "./supabase";
import "./style.css";

type DashboardData = {
  ok: boolean;

  summary: {
    installations: number;
    sessions: number;
    totalHours: number;
    avgSessionMinutes: number;
  };

  daily: Array<{
    day: string;
    installations: number;
    sessions: number;
    hours: number;
  }>;

  versions: Array<{
    version: string;
    installations: number;
    sessions: number;
  }>;
};

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <main class="shell">

    <header class="header">
      <div>
        <div class="brand-row">
          <div class="brand-mark"></div>

          <h1>VendiStat</h1>

          <span class="live">
            <span class="live-dot"></span>
            LIVE
          </span>
        </div>

        <p>Статистика использования VendiView</p>
      </div>

      <div class="period" id="periodLabel">
        —
      </div>
    </header>

    <section class="metrics">

      <article class="metric">
        <span class="metric-label">Установки</span>
        <strong id="metricInstallations">—</strong>
        <span class="metric-note">уникальных</span>
      </article>

      <article class="metric">
        <span class="metric-label">Сессии</span>
        <strong id="metricSessions">—</strong>
        <span class="metric-note">за месяц</span>
      </article>

      <article class="metric">
        <span class="metric-label">Время работы</span>
        <strong id="metricHours">—<span> ч</span></strong>
        <span class="metric-note">суммарно</span>
      </article>

      <article class="metric">
        <span class="metric-label">Средний сеанс</span>
        <strong id="metricAverage">—<span> мин</span></strong>
        <span class="metric-note">на запуск</span>
      </article>

    </section>

    <section class="panel activity-panel">

      <div class="panel-header">
        <div>
          <span class="eyebrow">АКТИВНОСТЬ</span>
          <h2>Сессии по дням</h2>
        </div>

        <span class="panel-badge" id="daysBadge">—</span>
      </div>

      <div class="chart-wrap">
        <canvas id="activityChart"></canvas>
      </div>

    </section>

    <section class="bottom-grid">

      <article class="panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow">ВЕРСИИ</span>
            <h2>VendiView</h2>
          </div>
        </div>

        <div id="versionsContainer">
          <div class="version-row">
            <div>
              <strong>—</strong>
              <span>ожидание данных</span>
            </div>
          </div>
        </div>
      </article>

      <article class="panel">

        <div class="panel-header">
          <div>
            <span class="eyebrow">ПОСЛЕДНИЕ ДНИ</span>
            <h2>Использование</h2>
          </div>
        </div>

        <div class="day-list" id="daysContainer">
          <div class="day-row">
            <span>—</span>
            <strong>ожидание данных</strong>
            <em>—</em>
          </div>
        </div>

      </article>

    </section>

    <footer id="footerStatus">
      VendiStat · подключение...
    </footer>

  </main>
`;

const installationsElement =
  document.querySelector<HTMLElement>("#metricInstallations")!;

const sessionsElement =
  document.querySelector<HTMLElement>("#metricSessions")!;

const hoursElement =
  document.querySelector<HTMLElement>("#metricHours")!;

const averageElement =
  document.querySelector<HTMLElement>("#metricAverage")!;

const periodElement =
  document.querySelector<HTMLElement>("#periodLabel")!;

const daysBadgeElement =
  document.querySelector<HTMLElement>("#daysBadge")!;

const versionsContainer =
  document.querySelector<HTMLElement>("#versionsContainer")!;

const daysContainer =
  document.querySelector<HTMLElement>("#daysContainer")!;

const footerStatus =
  document.querySelector<HTMLElement>("#footerStatus")!;

const canvas =
  document.querySelector<HTMLCanvasElement>("#activityChart")!;

const chart = new Chart<"line", number[], string>(canvas, {
  type: "line",

  data: {
    labels: [],

    datasets: [
      {
        label: "Сессии",
        data: [],
        borderColor: "#39f2c2",
        backgroundColor: "rgba(57, 242, 194, 0.10)",
        pointBackgroundColor: "#39f2c2",
        pointBorderColor: "#09100f",
        pointBorderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 3,
        tension: 0.38,
        fill: true,
      },

      {
        label: "Установки",
        data: [],
        borderColor: "#5aa7ff",
        backgroundColor: "rgba(90, 167, 255, 0.04)",
        pointBackgroundColor: "#5aa7ff",
        pointBorderColor: "#09100f",
        pointBorderWidth: 3,
        pointRadius: 4,
        borderWidth: 2,
        tension: 0.38,
      },
    ],
  },

  options: {
    responsive: true,
    maintainAspectRatio: false,

    interaction: {
      intersect: false,
      mode: "index",
    },

    plugins: {
      legend: {
        position: "top",
        align: "end",

        labels: {
          color: "#8d9ba5",
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 18,

          font: {
            size: 12,
          },
        },
      },

      tooltip: {
        backgroundColor: "#11191e",
        titleColor: "#ffffff",
        bodyColor: "#b5c0c7",
        borderColor: "#27363e",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },

    scales: {
      x: {
        border: {
          display: false,
        },

        grid: {
          display: false,
        },

        ticks: {
          color: "#657680",
        },
      },

      y: {
        beginAtZero: true,

        border: {
          display: false,
        },

        grid: {
          color: "rgba(130, 160, 175, 0.08)",
        },

        ticks: {
          color: "#657680",
          precision: 0,
        },
      },
    },
  },
});

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function currentMonthLabel(): string {
  const value = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderDashboard(data: DashboardData): void {
  installationsElement.textContent =
    String(data.summary.installations);

  sessionsElement.textContent =
    String(data.summary.sessions);

  hoursElement.innerHTML =
    `${data.summary.totalHours}<span> ч</span>`;

  averageElement.innerHTML =
    `${data.summary.avgSessionMinutes}<span> мин</span>`;

  periodElement.textContent = currentMonthLabel();

  daysBadgeElement.textContent =
    `${data.daily.length} дн.`;

  chart.data.labels =
    data.daily.map((item) => formatDay(item.day));

  chart.data.datasets[0].data =
    data.daily.map((item) => item.sessions);

  chart.data.datasets[1].data =
    data.daily.map((item) => item.installations);

  chart.update();

  const versions = [...data.versions].sort(
    (a, b) => b.installations - a.installations,
  );

  if (versions.length === 0) {
    versionsContainer.innerHTML = `
      <div class="version-row">
        <div>
          <strong>—</strong>
          <span>нет данных</span>
        </div>
      </div>
    `;
  } else {
    const maxInstallations = Math.max(
      ...versions.map((item) => item.installations),
      1,
    );

    versionsContainer.innerHTML = versions
      .map((item) => {
        const width =
          (item.installations / maxInstallations) * 100;

        return `
          <div style="margin-bottom: 18px">

            <div class="version-row">
              <div>
                <strong>${item.version}</strong>
                <span>${item.sessions} сессий</span>
              </div>

              <div class="version-value">
                <strong>${item.installations}</strong>
                <span>установки</span>
              </div>
            </div>

            <div class="version-bar">
              <div
                class="version-bar-fill"
                style="width: ${width}%"
              ></div>
            </div>

          </div>
        `;
      })
      .join("");
  }

  const recentDays = [...data.daily]
    .reverse()
    .slice(0, 5);

  if (recentDays.length === 0) {
    daysContainer.innerHTML = `
      <div class="day-row">
        <span>—</span>
        <strong>нет данных</strong>
        <em>—</em>
      </div>
    `;
  } else {
    daysContainer.innerHTML = recentDays
      .map(
        (item) => `
          <div class="day-row">
            <span>${formatDay(item.day)}</span>

            <strong>
              ${item.sessions}
              ${
                item.sessions === 1
                  ? "сессия"
                  : "сессий"
              }
            </strong>

            <em>${item.hours} ч</em>
          </div>
        `,
      )
      .join("");
  }

  footerStatus.textContent =
    `VendiStat · обновлено ${new Date().toLocaleTimeString(
      "ru-RU",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    )}`;
}

async function loadDashboard(): Promise<void> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    console.error("SESSION ERROR:", sessionError);
    return;
  }

  const session = sessionData.session;

  if (!session) {
    return;
  }

  const { data, error } =
    await supabase.functions.invoke<DashboardData>(
      "vendistat-dashboard-data",
      {
        headers: {
          Authorization:
            `Bearer ${session.access_token}`,
        },
      },
    );

  if (error) {
    console.error("DASHBOARD LOAD ERROR:", error);
    footerStatus.textContent =
      "VendiStat · ошибка обновления";
    return;
  }

  if (!data?.ok) {
    console.error("INVALID DASHBOARD RESPONSE:", data);
    return;
  }

  renderDashboard(data);
}

async function loginIfNeeded(): Promise<void> {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    console.error("SESSION ERROR:", error);
    return;
  }

  if (data.session) {
    await loadDashboard();
    return;
  }

  const email =
    window.prompt("VendiStat admin email:");

  if (!email) {
    return;
  }

  const password =
    window.prompt("VendiStat admin password:");

  if (!password) {
    return;
  }

  const { error: loginError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (loginError) {
    console.error("LOGIN FAILED:", loginError);
    window.alert("Не удалось войти в VendiStat.");
    return;
  }

  await loadDashboard();
}

/*
 * Первый запуск.
 * Если Supabase-сессия уже сохранена —
 * логин/пароль больше не спрашиваются.
 */
void loginIfNeeded();

/*
 * Автоматическое обновление статистики
 * раз в 60 секунд.
 */
window.setInterval(() => {
  void loadDashboard();
}, 60_000);

/*
 * Если вернулись на вкладку —
 * сразу получаем свежие данные.
 */
window.addEventListener("focus", () => {
  void loadDashboard();
});

/*
 * Особенно полезно на телефоне:
 * вернулся из другого приложения →
 * Dashboard обновился сразу.
 */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    void loadDashboard();
  }
});