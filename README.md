# Football Hub — Elite Dice Engine V6

Juego de fútbol con dados creado con React, Vite y Tailwind CSS. Esta carpeta
es un repositorio independiente y no depende del visor de Replit ni de la
configuración antigua de StackBlitz.

## Qué contiene

- `src/App.tsx`: código completo del juego.
- `src/main.tsx`: punto de entrada de React.
- `src/index.css`: estilos globales y Tailwind.
- `index.html`: documento HTML principal.
- `vite.config.ts`: configuración de Vite.
- `vercel.json`: configuración de publicación en Vercel.
- `package.json`: dependencias y comandos.
- `.github/workflows/ci.yml`: comprobación automática en GitHub.

## Requisitos

- Node.js 20 LTS o superior.
- npm 10 o superior.

## Ejecutarlo en tu computadora

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
npm install
npm run dev
```

Vite mostrará una dirección parecida a `http://localhost:5173`.

Para probar una compilación de producción:

```bash
npm run typecheck
npm run build
npm run preview
```

La partida, las temporadas y el historial se guardan en el `localStorage` del
navegador.

## Crear el repositorio en GitHub

### Opción A: desde la página de GitHub

1. Entra en [github.com](https://github.com) e inicia sesión.
2. Pulsa **New repository**.
3. Ponle un nombre, por ejemplo `football-hub-dice-game`.
4. Déjalo vacío: no marques README, `.gitignore` ni licencia, porque ya vienen
   incluidos en este proyecto.
5. Pulsa **Create repository**.
6. Descarga y descomprime este ZIP.
7. Entra en la carpeta descomprimida.
8. Pulsa **Add file → Upload files**.
9. Sube todo el contenido de la carpeta, incluida la carpeta `src` y la carpeta
   `.github`.
10. Pulsa **Commit changes**.

### Opción B: usando Git en una terminal

Después de crear un repositorio vacío en GitHub:

```bash
cd football-hub-v6-standalone
git init
git add .
git commit -m "Initial Football Hub V6"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` por tus datos reales.

## Publicarlo en Vercel

1. Entra en [vercel.com](https://vercel.com).
2. Pulsa **Add New → Project**.
3. Selecciona el repositorio de GitHub.
4. Vercel debe detectar Vite automáticamente.
5. Comprueba estos valores:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
6. Pulsa **Deploy**.

El archivo `vercel.json` ya contiene esos valores. No añadas un
`postcss.config.js` antiguo de StackBlitz: este proyecto usa Tailwind mediante
`@tailwindcss/vite`. Si Vercel muestra
`/vercel/path0/postcss.config.js`, está conectado a otra rama o a una copia
antigua del proyecto.

## Actualizar el juego

La única fuente del juego es `src/App.tsx`. Para subir una nueva versión:

1. Sustituye `src/App.tsx` por el archivo actualizado.
2. Ejecuta `npm run typecheck`.
3. Ejecuta `npm run build`.
4. Haz commit y push:

```bash
git add src/App.tsx
git commit -m "Update game"
git push
```

Vercel volverá a publicar automáticamente la nueva versión si el proyecto
está conectado al repositorio.
