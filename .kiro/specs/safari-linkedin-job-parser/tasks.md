# Implementation Plan: Safari LinkedIn Job Parser

## Overview

Реализация Safari Web Extension на JavaScript (Manifest V3), которое парсит вакансии с LinkedIn и сохраняет их в локальный бэкенд на `http://localhost:3333`. Расширение состоит из трёх JS-компонентов (Content Script, Background Service Worker, Popup) и Xcode-проекта для загрузки в Safari.

## Tasks

- [x] 1. Настройка структуры проекта и тестового окружения
  - Создать директорию `safari-extension/` в корне репозитория со следующей структурой:
    ```
    safari-extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.js
    ├── popup.css
    ├── icons/
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    └── tests/
        ├── unit/
        │   ├── content.test.js
        │   ├── background.test.js
        │   └── popup.test.js
        └── property/
            ├── url-classifier.property.test.js
            ├── parser.property.test.js
            ├── payload-builder.property.test.js
            └── duplicate-detector.property.test.js
    ```
  - Создать `safari-extension/package.json` с зависимостями: `vitest`, `jsdom`, `fast-check`, `@vitest/coverage-v8`
  - Настроить `vitest.config.js` с `environment: "jsdom"` и `globals: true`
  - Создать заглушки иконок (PNG 1×1 пиксель) в `icons/` для прохождения валидации манифеста
  - _Requirements: 6.1, 6.4_

- [x] 2. Создать `manifest.json`
  - Создать файл `safari-extension/manifest.json` с `manifest_version: 3`
  - Заполнить поля: `name: "LinkedIn Job Saver"`, `version: "1.0.0"`, `description`
  - Добавить `permissions: ["activeTab"]`
  - Добавить `host_permissions: ["https://www.linkedin.com/*", "http://localhost:3333/*"]`
  - Объявить `background.service_worker: "background.js"`
  - Объявить `action` с `default_popup: "popup.html"` и иконками `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
  - Объявить `content_scripts` с `matches: ["https://www.linkedin.com/jobs/view/*"]`, `js: ["content.js"]`, `run_at: "document_idle"`
  - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.1 Написать unit-тест для manifest.json
    - Прочитать `manifest.json` через `fs.readFileSync` и распарсить JSON
    - Проверить наличие всех обязательных полей: `manifest_version`, `name`, `version`, `description`, `permissions`, `host_permissions`, `background`, `action`, `content_scripts`
    - Проверить `manifest_version === 3`
    - Проверить `permissions` содержит `"activeTab"`
    - Проверить `host_permissions` содержит `"https://www.linkedin.com/*"` и `"http://localhost:3333/*"`
    - Проверить `content_scripts[0].matches` содержит `"https://www.linkedin.com/jobs/view/*"`
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 3. Реализовать Content Script (`content.js`)
  - Создать файл `safari-extension/content.js`
  - Объявить константы `ROLE_SELECTORS` и `COMPANY_SELECTORS` — массивы CSS-селекторов в порядке приоритета согласно дизайну:
    ```javascript
    const ROLE_SELECTORS = [
      'h1.top-card-layout__title',
      'h1[class*="job-title"]',
      '.job-details-jobs-unified-top-card__job-title h1',
      'h1'
    ];
    const COMPANY_SELECTORS = [
      '.top-card-layout__card a.topcard__org-name-link',
      '.job-details-jobs-unified-top-card__company-name a',
      '[class*="company-name"] a',
      '[class*="company-name"]'
    ];
    ```
  - Реализовать функцию `trySelectors(selectors)`: перебирает массив селекторов, возвращает `textContent.trim()` первого найденного непустого элемента, иначе `""`
  - Реализовать функцию `parseJobData()`: вызывает `trySelectors` для роли и компании, возвращает `{ role, company, url: window.location.href }`, где `role` и `company` — результат `trySelectors` или `"Не определено"` если пустая строка
  - Добавить слушатель `chrome.runtime.onMessage.addListener` для сообщения `{ action: "getJobData" }`: вызывает `parseJobData()`, возвращает `{ success: true, data }` или `{ success: false, error: error.message }` при исключении; слушатель возвращает `true` для асинхронного ответа
  - Экспортировать `parseJobData`, `trySelectors` для тестирования (через `if (typeof module !== 'undefined') module.exports = ...`)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 1.3_

  - [x] 3.1 Написать unit-тесты для content.js
    - Мокировать `chrome.runtime.onMessage.addListener` через `vi.fn()`
    - Тест: парсер извлекает роль из `h1.top-card-layout__title` — установить `document.body.innerHTML` с этим элементом, вызвать `parseJobData()`, проверить `role`
    - Тест: парсер извлекает роль из запасного селектора `h1[class*="job-title"]` когда основной отсутствует
    - Тест: парсер возвращает `"Не определено"` для роли когда ни один селектор не найден
    - Тест: парсер извлекает компанию из `.topcard__org-name-link`
    - Тест: парсер возвращает `"Не определено"` для компании когда ни один селектор не найден
    - Тест: `trySelectors` возвращает `""` для пустого массива
    - Тест: `trySelectors` пропускает элементы с пустым `textContent`
    - _Requirements: 2.1, 2.2, 2.4, 2.5_

  - [ ]* 3.2 Написать property-тест: парсер всегда возвращает непустую строку для role и company (Property 2, Property 3)
    - **Property 2: Парсер всегда возвращает непустую строку для role**
    - **Property 3: Парсер всегда возвращает непустую строку для company**
    - **Validates: Requirements 2.1, 2.4, 2.2, 2.5**
    - Использовать `fc.string()` для генерации произвольного HTML
    - Установить `document.body.innerHTML = html`, вызвать `parseJobData()`
    - Проверить: `typeof result.role === "string" && result.role.length > 0`
    - Проверить: `typeof result.company === "string" && result.company.length > 0`
    - `numRuns: 100`

  - [ ]* 3.3 Написать property-тест: парсер не изменяет DOM (Property 4)
    - **Property 4: Парсер не изменяет DOM страницы**
    - **Validates: Requirements 2.6**
    - Использовать `fc.string()` для генерации произвольного HTML
    - Сохранить `before = document.body.innerHTML`, вызвать `parseJobData()`, сравнить с `after = document.body.innerHTML`
    - Проверить `before === after`
    - `numRuns: 100`

- [x] 4. Реализовать Background Service Worker (`background.js`)
  - Создать файл `safari-extension/background.js`
  - Реализовать функцию `isDuplicateUrl(vacancies, url)`: возвращает `true` если хотя бы один элемент массива имеет `v.url === url`, иначе `false`
  - Реализовать функцию `buildPayload(data)`: принимает `{ role, company, url }`, возвращает `VacancyPayload` с полями `role`, `company`, `applied_at` (текущая дата `YYYY-MM-DD` через `new Date().toISOString().split("T")[0]`), `applied: false`, `status: "saved"`, `url`
  - Реализовать `async function checkDuplicate(url)`:
    - Выполнить `fetch("http://localhost:3333/vacancies", { signal: AbortSignal.timeout(5000) })`
    - Если `!response.ok` — выбросить ошибку
    - Распарсить JSON, вернуть `isDuplicateUrl(vacancies, url)`
    - В `catch`: если `error.name === "TimeoutError"` или `error.name === "TypeError"` — вернуть `false` (fail-open); иначе вернуть `false`
  - Реализовать `async function saveVacancy(data)`:
    - Выполнить `fetch("http://localhost:3333/vacancies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), signal: AbortSignal.timeout(5000) })`
    - Если `response.status === 201` — вернуть `{ success: true, vacancy: await response.json() }`
    - Иначе — распарсить тело, вернуть `{ success: false, error: body.error || "Неизвестная ошибка", status: response.status }`
    - В `catch`: если `error.name === "TimeoutError"` или `error.name === "TypeError"` — вернуть `{ success: false, error: "Бэкенд недоступен. Убедитесь, что сервер запущен на http://localhost:3333" }`; иначе `{ success: false, error: error.message }`
  - Добавить слушатель `chrome.runtime.onMessage.addListener` для `action: "checkDuplicate"` и `action: "saveVacancy"`, вызывающий соответствующие функции и передающий результат в `sendResponse`; слушатель возвращает `true`
  - Экспортировать `checkDuplicate`, `saveVacancy`, `isDuplicateUrl`, `buildPayload` для тестирования
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2_

  - [x] 4.1 Написать unit-тесты для background.js
    - Мокировать глобальный `fetch` через `vi.stubGlobal("fetch", vi.fn())`
    - Тест: `saveVacancy` вызывает `fetch` с методом `POST` и заголовком `Content-Type: application/json`
    - Тест: `saveVacancy` возвращает `{ success: true }` при статусе `201`
    - Тест: `saveVacancy` возвращает `{ success: false, error }` при статусе `400`
    - Тест: `saveVacancy` возвращает `{ success: false, error }` при статусе `500`
    - Тест: `saveVacancy` возвращает сообщение о недоступности бэкенда при `TypeError` (fetch failed)
    - Тест: `saveVacancy` возвращает сообщение о недоступности бэкенда при `TimeoutError`
    - Тест: `checkDuplicate` возвращает `true` если URL найден в списке вакансий
    - Тест: `checkDuplicate` возвращает `false` если URL не найден
    - Тест: `checkDuplicate` возвращает `false` при сетевой ошибке (fail-open)
    - Тест: `isDuplicateUrl` возвращает `false` для пустого массива
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1_

  - [-]* 4.2 Написать property-тест: buildPayload всегда возвращает корректный VacancyPayload (Property 6)
    - **Property 6: Тело POST-запроса содержит все обязательные поля с корректными типами**
    - **Validates: Requirements 4.2**
    - Использовать `fc.record({ role: fc.string({ minLength: 1 }), company: fc.string({ minLength: 1 }), url: fc.webUrl() })`
    - Вызвать `buildPayload(data)`, проверить:
      - `typeof payload.role === "string" && payload.role.length > 0`
      - `typeof payload.company === "string" && payload.company.length > 0`
      - `/^\d{4}-\d{2}-\d{2}$/.test(payload.applied_at)`
      - `payload.applied === false`
      - `payload.status === "saved"`
      - `typeof payload.url === "string"`
    - `numRuns: 100`

  - [-]* 4.3 Написать property-тест: isDuplicateUrl корректно обнаруживает дубликаты (Property 7)
    - **Property 7: Обнаружение дубликата по URL**
    - **Validates: Requirements 5.2**
    - Использовать `fc.array(fc.record({ url: fc.webUrl(), role: fc.string(), company: fc.string() }))` и `fc.webUrl()`
    - Проверить: `isDuplicateUrl(vacancies, url) === vacancies.some(v => v.url === url)`
    - `numRuns: 100`

  - [ ]* 4.4 Написать property-тест: saveVacancy возвращает ошибку при любом не-201 статусе (Property 8)
    - **Property 8: Ошибка сохранения отображается при любом не-201 статусе**
    - **Validates: Requirements 4.5**
    - Использовать `fc.integer({ min: 100, max: 599 }).filter(s => s !== 201)`
    - Мокировать `fetch` через `vi.stubGlobal` с нужным статусом
    - Проверить: `result.success === false && typeof result.error === "string" && result.error.length > 0`
    - `numRuns: 100`

- [x] 5. Checkpoint — убедиться, что все тесты content.js и background.js проходят
  - Запустить `npx vitest --run tests/unit/content.test.js tests/unit/background.test.js`
  - Запустить `npx vitest --run tests/property/parser.property.test.js tests/property/payload-builder.property.test.js tests/property/duplicate-detector.property.test.js`
  - Все тесты должны пройти. При ошибках — исправить реализацию в `content.js` или `background.js`.
  - _Requirements: 2.1–2.6, 4.1–4.7, 5.1–5.2_

- [x] 6. Реализовать Popup HTML и CSS (`popup.html`, `popup.css`)
  - Создать файл `safari-extension/popup.html` с разметкой согласно дизайну:
    - `<div id="state-loading">` — спиннер и текст «Загрузка данных...»
    - `<div id="state-not-job-page" class="state hidden">` — сообщение «Откройте страницу вакансии на LinkedIn»
    - `<div id="state-data-error" class="state hidden">` — элемент `<p id="data-error-message">`
    - `<div id="state-data-ready" class="state hidden">` — поля `#field-role`, `#field-company`, `#field-url`; блок `#duplicate-warning` (скрытый); кнопки `#btn-save` и `#btn-save-anyway` (скрытая); параграф `#save-result` (скрытый)
    - Подключить `popup.css` и `popup.js`
  - Создать файл `safari-extension/popup.css`:
    - Задать `width: 320px`, `min-height: 120px`, `padding: 16px`, `font-family: system-ui`
    - Стиль `.hidden { display: none }`
    - Стиль `.spinner` — CSS-анимация вращения (border + border-radius + animation)
    - Стиль `.btn-primary` — синяя кнопка на всю ширину
    - Стиль `.btn-secondary` — серая кнопка на всю ширину
    - Стиль `.warning` — жёлтый фон, скруглённые углы
    - Стиль `.error` — красный цвет текста
    - Стиль `.url-truncated` — `overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; display: block`
    - Стиль `.field` — `margin-bottom: 8px`; `label` — `font-weight: bold; display: block; font-size: 12px; color: #666`
  - _Requirements: 3.1, 3.2, 3.3, 1.2_

- [x] 7. Реализовать логику Popup (`popup.js`)
  - Создать файл `safari-extension/popup.js`
  - Объявить константы:
    ```javascript
    const JOB_PAGE_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/view\//;
    const DATA_TIMEOUT_MS = 5000;
    ```
  - Реализовать вспомогательные функции:
    - `showState(stateId)` — скрывает все элементы с классом `.state`, показывает `#state-{stateId}`
    - `fillFields(data)` — устанавливает `textContent` элементов `#field-role`, `#field-company`, `#field-url`
    - `showDuplicateWarning()` — убирает `hidden` у `#duplicate-warning` и `#btn-save-anyway`
    - `showSaveResult(type, message)` — устанавливает текст и класс (`success`/`error`) у `#save-result`, убирает `hidden`
    - `disableSaveButtons()` — устанавливает `disabled = true` на `#btn-save` и `#btn-save-anyway`
    - `enableSaveButtons()` — устанавливает `disabled = false` на `#btn-save` и `#btn-save-anyway`
    - `formatDate(date)` — возвращает `date.toISOString().split("T")[0]`
    - `withTimeout(promise, ms)` — возвращает `Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))])`
    - `getCurrentTab()` — возвращает `chrome.tabs.query({ active: true, currentWindow: true })` и берёт первый элемент
    - `sendMessageToTab(tabId, message)` — возвращает `chrome.tabs.sendMessage(tabId, message)`
    - `sendMessageToBackground(message)` — возвращает `chrome.runtime.sendMessage(message)`
  - Реализовать `async function saveJob(data)`:
    - Вызвать `disableSaveButtons()`
    - Сформировать `payload` через `buildPayload`-подобную логику (inline): `{ role: data.role, company: data.company, applied_at: formatDate(new Date()), applied: false, status: "saved", url: data.url }`
    - Отправить `sendMessageToBackground({ action: "saveVacancy", data: payload })`
    - При `result.success === true` — вызвать `showSaveResult("success", "Вакансия сохранена ✓")`
    - При ошибке — вызвать `showSaveResult("error", result.error)` и `enableSaveButtons()`
  - Реализовать основной обработчик `DOMContentLoaded`:
    - `showState("loading")`
    - Получить текущую вкладку через `getCurrentTab()`
    - Если `!JOB_PAGE_PATTERN.test(tab.url)` — вызвать `showState("not-job-page")` и выйти
    - Запросить данные у Content Script через `withTimeout(sendMessageToTab(tab.id, { action: "getJobData" }), DATA_TIMEOUT_MS)`
    - При таймауте или ошибке — установить текст `#data-error-message` и вызвать `showState("data-error")`
    - При `jobData.success === false` — установить текст `#data-error-message` и вызвать `showState("data-error")`
    - Вызвать `fillFields(jobData.data)`
    - Запросить проверку дубликата через `sendMessageToBackground({ action: "checkDuplicate", url: jobData.data.url })`
    - Если `dupResult.isDuplicate === true` — вызвать `showDuplicateWarning()`
    - Вызвать `showState("data-ready")`
    - Добавить обработчик клика на `#btn-save`: вызвать `saveJob(jobData.data)`
    - Добавить обработчик клика на `#btn-save-anyway`: вызвать `saveJob(jobData.data)`
  - Экспортировать `fillFields`, `showState`, `formatDate`, `withTimeout`, `showSaveResult`, `showDuplicateWarning` для тестирования
  - _Requirements: 1.2, 3.1, 3.2, 3.3, 3.4, 4.4, 4.5, 4.6, 4.7, 5.2, 5.3_

  - [x] 7.1 Написать unit-тесты для popup.js
    - Настроить `beforeEach` с `document.body.innerHTML` — полная разметка из `popup.html`
    - Мокировать `chrome.tabs.query`, `chrome.tabs.sendMessage`, `chrome.runtime.sendMessage` через `vi.fn()`
    - Тест: `showState("loading")` показывает `#state-loading` и скрывает остальные `.state`
    - Тест: `showState("not-job-page")` показывает `#state-not-job-page`
    - Тест: `fillFields({ role: "Engineer", company: "ACME", url: "https://..." })` устанавливает корректные `textContent`
    - Тест: `showDuplicateWarning()` убирает `hidden` у `#duplicate-warning` и `#btn-save-anyway`
    - Тест: `showSaveResult("success", "Вакансия сохранена ✓")` устанавливает текст и убирает `hidden` у `#save-result`
    - Тест: `showSaveResult("error", "Ошибка")` устанавливает класс `error`
    - Тест: `formatDate(new Date("2024-01-15"))` возвращает `"2024-01-15"`
    - Тест: `withTimeout` отклоняет промис по истечении таймаута
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.2 Написать property-тест: fillFields корректно отображает данные (Property 5)
    - **Property 5: fillFields корректно отображает данные вакансии**
    - **Validates: Requirements 3.1**
    - Использовать `fc.record({ role: fc.string({ minLength: 1 }), company: fc.string({ minLength: 1 }), url: fc.webUrl() })`
    - Вызвать `fillFields(data)`, проверить `textContent` элементов `#field-role`, `#field-company`, `#field-url`
    - `numRuns: 100`

  - [ ]* 7.3 Написать property-тест: isJobPage корректно классифицирует URL (Property 1)
    - **Property 1: URL-паттерн корректно классифицирует страницы**
    - **Validates: Requirements 1.2**
    - Экспортировать функцию `isJobPage(url)` из `popup.js` (или отдельный модуль `url-classifier.js`)
    - Использовать `fc.oneof(fc.webUrl(), fc.constant("https://www.linkedin.com/jobs/view/123456789/"))`
    - Проверить: `isJobPage(url) === /^https:\/\/www\.linkedin\.com\/jobs\/view\//.test(url)`
    - `numRuns: 100`

- [x] 8. Checkpoint — убедиться, что все тесты проходят
  - Запустить `npx vitest --run` из директории `safari-extension/`
  - Все тесты (unit + property) должны пройти без ошибок
  - При ошибках — исправить реализацию в соответствующих файлах
  - _Requirements: все_

- [x] 9. Создать Xcode-проект для Safari Extension
  - Создать директорию `safari-extension/xcode/`
  - Создать файл `safari-extension/xcode/README.md` с инструкцией по созданию Xcode-проекта:
    1. Открыть Xcode → File → New → Project → macOS → Safari Extension App
    2. Задать Product Name: `LinkedInJobSaver`, Bundle Identifier: `com.local.LinkedInJobSaver`
    3. В настройках таргета расширения указать путь к директории `safari-extension/` как папку с ресурсами Web Extension
    4. Скопировать файлы расширения (`manifest.json`, `*.js`, `*.html`, `*.css`, `icons/`) в папку `Resources` Xcode-таргета
    5. В Xcode: Product → Run → открыть Safari → Preferences → Extensions → включить `LinkedIn Job Saver`
    6. Для разработки без подписи: Xcode → Signing & Capabilities → отключить автоматическую подпись, выбрать Development team
  - Создать файл `safari-extension/xcode/Info.plist` с минимальными настройками для macOS-приложения:
    ```xml
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
      <key>CFBundleName</key>
      <string>LinkedIn Job Saver</string>
      <key>CFBundleIdentifier</key>
      <string>com.local.LinkedInJobSaver</string>
      <key>CFBundleVersion</key>
      <string>1</string>
      <key>CFBundleShortVersionString</key>
      <string>1.0.0</string>
      <key>NSHumanReadableCopyright</key>
      <string>Copyright © 2024. All rights reserved.</string>
    </dict>
    </plist>
    ```
  - _Requirements: 6.4, 6.5_

- [x] 10. Финальный checkpoint — полная проверка
  - Запустить `npx vitest --run` из директории `safari-extension/` — все тесты должны пройти
  - Проверить, что `manifest.json` валиден (все обязательные поля присутствуют)
  - Проверить, что все файлы расширения существуют: `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js`, `popup.css`, `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
  - Убедиться, что нет `console.error` в коде (только `console.warn` для отладки)
  - Задать пользователю вопрос, если что-то неясно.
  - _Requirements: все_

## Notes

- Задачи, помеченные `*`, являются опциональными и могут быть пропущены для быстрого MVP
- Каждая задача ссылается на конкретные требования для трассируемости
- Все сетевые запросы используют `AbortSignal.timeout(5000)` для защиты от зависания
- Проверка дубликатов работает по принципу fail-open: при ошибке GET /vacancies сохранение не блокируется
- Кнопка сохранения остаётся заблокированной после успешного сохранения (предотвращение дублей)
- Тесты запускаются командой `npx vitest --run` из директории `safari-extension/`
- Для ручного тестирования в Safari необходим Xcode и включённый режим разработчика в Safari
