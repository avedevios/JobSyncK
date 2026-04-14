# Requirements Document

## Introduction

Safari Extension для macOS, которое позволяет пользователю сохранять вакансии с LinkedIn одним кликом.
Когда пользователь открывает страницу вакансии на LinkedIn и нажимает на иконку расширения, Extension
парсит страницу (название роли, компания, URL) и отправляет данные POST-запросом на локальный бэкенд
`http://localhost:3333/vacancies`. Бэкенд уже реализован на Node.js + Express + sql.js.

## Glossary

- **Extension** — Safari Web Extension для macOS, реализованное по стандарту Safari App Extension / Web Extension API.
- **Content_Script** — JavaScript-скрипт расширения, выполняемый в контексте страницы LinkedIn.
- **Background_Script** — Service Worker расширения, обрабатывающий сообщения и выполняющий сетевые запросы.
- **Popup** — HTML-страница, отображаемая при клике на иконку расширения в тулбаре Safari.
- **Backend** — локальный HTTP-сервер на `http://localhost:3333`, принимающий вакансии через `POST /vacancies`.
- **Vacancy** — запись о вакансии с полями: `role`, `company`, `applied_at`, `applied`, `status`, `url`.
- **LinkedIn_Job_Page** — страница вакансии на LinkedIn, URL которой соответствует паттерну `https://www.linkedin.com/jobs/view/*`.
- **Parser** — логика Content_Script, извлекающая данные вакансии из DOM страницы LinkedIn.

---

## Requirements

### Requirement 1: Определение страницы вакансии LinkedIn

**User Story:** As a job seeker, I want the extension to recognize when I am on a LinkedIn job page, so that the save button is available only on relevant pages.

#### Acceptance Criteria

1. WHEN пользователь открывает страницу с URL, соответствующим паттерну `https://www.linkedin.com/jobs/view/*`, THE Extension SHALL активировать иконку расширения в тулбаре Safari.
2. WHEN пользователь открывает страницу, URL которой не соответствует паттерну `https://www.linkedin.com/jobs/view/*`, THE Extension SHALL отображать в Popup сообщение «Откройте страницу вакансии на LinkedIn».
3. THE Content_Script SHALL выполняться только на страницах, соответствующих паттерну `https://www.linkedin.com/jobs/view/*`.

---

### Requirement 2: Парсинг данных вакансии

**User Story:** As a job seeker, I want the extension to automatically extract job details from the LinkedIn page, so that I don't have to copy them manually.

#### Acceptance Criteria

1. WHEN пользователь открывает LinkedIn_Job_Page, THE Parser SHALL извлечь название роли из DOM страницы.
2. WHEN пользователь открывает LinkedIn_Job_Page, THE Parser SHALL извлечь название компании из DOM страницы.
3. WHEN пользователь открывает LinkedIn_Job_Page, THE Parser SHALL извлечь текущий URL страницы.
4. IF Parser не может извлечь название роли из DOM, THEN THE Parser SHALL вернуть значение `«Не определено»` для поля `role`.
5. IF Parser не может извлечь название компании из DOM, THEN THE Parser SHALL вернуть значение `«Не определено»` для поля `company`.
6. THE Parser SHALL извлекать данные без изменения DOM страницы LinkedIn.

> **Примечание по тестированию:** Парсер является критическим компонентом. Необходимо включить тест на устойчивость к изменениям DOM (round-trip: парсинг → сериализация → десериализация данных вакансии).

---

### Requirement 3: Отображение данных в Popup перед сохранением

**User Story:** As a job seeker, I want to see the extracted job details before saving, so that I can verify the data is correct.

#### Acceptance Criteria

1. WHEN пользователь кликает на иконку расширения на LinkedIn_Job_Page, THE Popup SHALL отобразить извлечённые значения полей `role`, `company` и `url`.
2. WHEN данные успешно извлечены, THE Popup SHALL отобразить кнопку «Сохранить вакансию».
3. WHILE Popup ожидает ответа от Content_Script, THE Popup SHALL отображать индикатор загрузки.
4. IF Content_Script не вернул данные в течение 5 секунд, THEN THE Popup SHALL отобразить сообщение об ошибке «Не удалось получить данные страницы».

---

### Requirement 4: Отправка вакансии на бэкенд

**User Story:** As a job seeker, I want to save a job vacancy to my local backend with one click, so that I can track my job applications.

#### Acceptance Criteria

1. WHEN пользователь нажимает кнопку «Сохранить вакансию» в Popup, THE Background_Script SHALL отправить POST-запрос на `http://localhost:3333/vacancies`.
2. THE Background_Script SHALL включить в тело запроса поля: `role` (строка), `company` (строка), `applied_at` (текущая дата в формате `YYYY-MM-DD`), `applied` (значение `false`), `status` (значение `"saved"`), `url` (строка).
3. THE Background_Script SHALL установить заголовок запроса `Content-Type: application/json`.
4. WHEN Backend возвращает HTTP-статус `201`, THE Popup SHALL отобразить сообщение «Вакансия сохранена ✓».
5. IF Backend возвращает HTTP-статус, отличный от `201`, THEN THE Popup SHALL отобразить сообщение «Ошибка сохранения: [текст ошибки от сервера]».
6. IF Backend недоступен (сетевая ошибка или таймаут), THEN THE Popup SHALL отобразить сообщение «Бэкенд недоступен. Убедитесь, что сервер запущен на http://localhost:3333».
7. WHILE Background_Script ожидает ответа от Backend, THE Popup SHALL блокировать повторное нажатие кнопки «Сохранить вакансию».

---

### Requirement 5: Предотвращение дублирования вакансий

**User Story:** As a job seeker, I want to be notified if I try to save a job I've already saved, so that I don't create duplicate entries.

#### Acceptance Criteria

1. WHEN пользователь открывает LinkedIn_Job_Page, THE Background_Script SHALL выполнить GET-запрос на `http://localhost:3333/vacancies` для проверки наличия вакансии с совпадающим `url`.
2. IF вакансия с совпадающим `url` уже существует в Backend, THEN THE Popup SHALL отобразить предупреждение «Эта вакансия уже сохранена».
3. WHERE предупреждение о дубликате отображается, THE Popup SHALL предоставить кнопку «Сохранить повторно» для принудительного сохранения.

---

### Requirement 6: Структура и сборка расширения

**User Story:** As a developer, I want the extension to follow Safari Web Extension standards, so that it can be loaded and distributed correctly.

#### Acceptance Criteria

1. THE Extension SHALL содержать файл `manifest.json` версии 3 (Manifest V3) с корректно заполненными полями `name`, `version`, `description`, `permissions`, `host_permissions` и `action`.
2. THE Extension SHALL запрашивать разрешение `activeTab` для доступа к текущей вкладке.
3. THE Extension SHALL объявить `host_permissions` для доменов `https://www.linkedin.com/*` и `http://localhost:3333/*`.
4. THE Extension SHALL быть упакована в Xcode-проект для загрузки через Safari Extension Builder.
5. WHERE разработчик использует Xcode, THE Extension SHALL поддерживать загрузку в режиме разработки без подписи App Store.
