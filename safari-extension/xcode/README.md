# Создание Xcode-проекта для Safari Extension

Это руководство описывает, как создать Xcode-проект для загрузки расширения **LinkedIn Job Saver** в Safari на macOS.

## Требования

- macOS 12 Monterey или новее
- Xcode 14 или новее (доступен в Mac App Store)
- Safari 15 или новее
- Включённый режим разработчика в Safari

## Шаг 1: Включить режим разработчика в Safari

1. Открыть Safari → **Настройки** (⌘,) → вкладка **Дополнения**
2. Включить опцию **Показывать меню «Разработка» в строке меню**
3. В меню **Разработка** включить **Разрешить неподписанные расширения**

## Шаг 2: Создать новый Xcode-проект

1. Открыть Xcode
2. Выбрать **File → New → Project...**
3. В разделе **macOS** выбрать шаблон **Safari Extension App**
4. Нажать **Next** и заполнить параметры:
   - **Product Name**: `LinkedInJobSaver`
   - **Bundle Identifier**: `com.local.LinkedInJobSaver`
   - **Language**: Swift
   - **Team**: выбрать свою команду или «None» для локальной разработки
5. Выбрать папку для сохранения проекта и нажать **Create**

## Шаг 3: Добавить файлы расширения

Xcode создаст два таргета: основное приложение и таргет расширения (с суффиксом `Extension`).

1. В навигаторе проекта найти папку `Resources` внутри таргета расширения
2. Удалить файлы-заглушки, созданные Xcode (если есть)
3. Скопировать все файлы расширения из директории `safari-extension/` в папку `Resources`:
   - `manifest.json`
   - `background.js`
   - `content.js`
   - `popup.html`
   - `popup.js`
   - `popup.css`
   - `icons/icon16.png`
   - `icons/icon48.png`
   - `icons/icon128.png`
4. При добавлении файлов в Xcode убедиться, что выбран таргет расширения (не основного приложения)

Альтернативный способ — указать путь к директории `safari-extension/` как папку с ресурсами:
1. Выбрать таргет расширения → вкладка **Build Phases**
2. В секции **Copy Bundle Resources** добавить папку `safari-extension/` через кнопку «+»

## Шаг 4: Настроить подпись (для локальной разработки)

1. Выбрать таргет расширения в навигаторе проекта
2. Перейти на вкладку **Signing & Capabilities**
3. Снять галочку **Automatically manage signing**
4. В поле **Team** выбрать «None» или свою команду разработчика
5. Убедиться, что **Bundle Identifier** совпадает с `com.local.LinkedInJobSaver`

## Шаг 5: Собрать и запустить

1. Выбрать схему основного приложения (не расширения) в тулбаре Xcode
2. Нажать **Product → Run** (⌘R) или кнопку ▶
3. Откроется вспомогательное приложение — нажать кнопку **Quit and Open Safari Extensions Preferences**
4. В Safari откроется вкладка **Настройки → Расширения**
5. Найти **LinkedIn Job Saver** и включить его

## Шаг 6: Проверить работу расширения

1. Перейти на страницу вакансии LinkedIn: `https://www.linkedin.com/jobs/view/<id>/`
2. Нажать на иконку расширения в тулбаре Safari
3. Popup должен отобразить данные вакансии (роль, компания, URL)
4. Убедиться, что бэкенд запущен: `cd backend && node server.js`
5. Нажать **Сохранить** — вакансия должна появиться в базе данных

## Устранение неполадок

### Расширение не появляется в Safari
- Убедитесь, что в Safari включён режим разработчика и разрешены неподписанные расширения
- Пересоберите проект: **Product → Clean Build Folder** (⌘⇧K), затем **Product → Run**

### Ошибка «Cannot load extension»
- Проверьте, что `manifest.json` находится в папке `Resources` таргета расширения
- Убедитесь, что `manifest_version` равен `3`

### Popup не получает данные
- Откройте консоль Safari (**Разработка → Показать инспектор веб-страниц**) и проверьте ошибки
- Убедитесь, что Content Script загружен на странице вакансии

### Бэкенд недоступен
- Запустите сервер: `cd backend && node server.js`
- Проверьте, что сервер слушает порт `3333`: `curl http://localhost:3333/vacancies`

## Структура Xcode-проекта

```
LinkedInJobSaver/
├── LinkedInJobSaver/          # Основное приложение (обёртка)
│   ├── AppDelegate.swift
│   └── ViewController.swift
├── LinkedInJobSaver Extension/ # Таргет расширения
│   ├── SafariWebExtensionHandler.swift
│   └── Resources/             # Файлы Web Extension
│       ├── manifest.json
│       ├── background.js
│       ├── content.js
│       ├── popup.html
│       ├── popup.js
│       ├── popup.css
│       └── icons/
│           ├── icon16.png
│           ├── icon48.png
│           └── icon128.png
└── LinkedInJobSaver.xcodeproj
```

## Дополнительные ресурсы

- [Apple Developer: Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari_web_extensions)
- [Converting a Web Extension for Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)
- [Manifest V3 Overview](https://developer.chrome.com/docs/extensions/mv3/intro/)
