# SPEC-001: Arquitectura Base, Aislamiento de Dominio y Barreras de Calidad

- **Estado:** Aprobada
- **Fecha:** 2026-11-18
- **Área:** Arquitectura de Software / Infraestructura de Código
- **Autores:** Arquitecto de Software & Analista SDD
- **Dependencias:** `docs/constitution.md`, `AGENTS.md`

---

## 1. Contexto y Objetivo

### 1.1. Contexto
El repositorio cuenta con una base funcional prototípica en React 19, TypeScript y Tailwind CSS v4, con datos mockeados y vistas alineadas al diseño de Google Stitch. Sin embargo, antes de avanzar con nuevas capacidades de negocio, la lógica de cálculo (precios, pesos, arqueo, fiado y márgenes) se encuentra dispersa entre utilidades, componentes de UI y stores de Zustand.

### 1.2. Objetivo
Consolidar el arnés arquitectónico base del sistema para garantizar:
1. **Core Isolation:** Lógica de negocio pura, determinista y 100% desacoplada de la UI y del framework.
2. **Encapsulamiento Modular:** Estructura modular estándar por dominios (`src/features/*`) con APIs públicas bien definidas y prohibición de importaciones profundas (*deep imports*).
3. **Data Inviolability & Zero Bloat:** Validación de entradas en fronteras con patrón `Result` nativo en TypeScript (sin librerías externas pesadas) y recuperación tolerante a fallos ante datos corruptos en persistencia.
4. **Zero-Defect Gate:** Un pipeline de verificación automatizado con tipado estricto y cobertura del 100% en lógica pura.

---

## 2. Actores

- **Desarrollador / Ingeniero de Software:** Diseña e implementa módulos respetando los contratos y barreras arquitectónicas.
- **Agente de IA (Antigravity):** Ejecuta tareas guiado estrictamente por la especificación aprobada, sin desvíos ni dependencias superfluas.
- **Pipeline de Integración / CI:** Valida el cumplimiento del tipado estricto, análisis estático y cobertura de pruebas antes de autorizar cambios.

---

## 3. Historias Técnicas

- **HT-01 (Aislamiento de Lógica Pura):** Como desarrollador del sistema, quiero que todos los cálculos de negocio residan en funciones puras dentro de `src/features/<dominio>/domain/`, para poder probar exhaustivamente las reglas de retail y pesaje sin montar componentes de React ni instanciar stores.
- **HT-02 (Validación en Fronteras sin Sobrecarga):** Como sistema operativo comercial, quiero validar y sanitizar toda entrada del usuario (lector, balanza, teclado) mediante tipos y funciones nativas `Result<T, ValidationError>`, para prevenir estados inválidos (NaN, valores negativos) sin sobrecargar el bundle con librerías externas.
- **HT-03 (Persistencia Resiliente):** Como operador de caja, quiero que el sistema sea tolerante a corrupciones de `localStorage`, generando copias de respaldo preventivas e inicializando estados seguros por defecto, para que la caja nunca quede bloqueada durante el servicio.
- **HT-04 (Encapsulamiento de Dominios):** Como arquitecto de software, quiero que cada módulo exponga únicamente su `index.ts` y que los tipos transversales residan en `src/types/`, para prevenir dependencias circulares y facilitar el desacoplamiento modular.
- **HT-05 (Puerta de Entrada de Cero Defectos):** Como responsable de calidad, quiero que cualquier tarea exija la ejecución limpia de typecheck, linting y tests al 100%, para impedir el ingreso de código degradado al repositorio.

---

## 4. Requisitos Funcionales (Sintaxis EARS)

### 4.1. Estructura y Modularización por Dominio
- **[RF-01.1]** *EL SISTEMA* organizará cada dominio en `src/features/<dominio>/` conteniendo obligatoriamente:
  - `domain/`: Reglas de negocio, cálculos y validadores puros.
  - `components/`: Componentes visuales exclusivos del dominio.
  - `hooks/` o `stores/`: Adaptadores de estado y persistencia reactiva.
  - `index.ts`: Punto de entrada único que expone la API pública del módulo.
- **[RF-01.2]** *MIENTRAS* un archivo resida dentro del directorio `src/features/<dominio>/domain/`, *EL SISTEMA* prohibirá estrictamente la importación de módulos provenientes de `react`, `zustand`, hooks de estado o del DOM del navegador.
- **[RF-01.3]** *EL SISTEMA* limitará el contenido de `src/lib/` únicamente a utilidades técnicas transversales agnósticas al negocio (formateo numérico/fechas, concatenación de clases CSS o matemáticas elementales).

### 4.2. Validación de Entradas y Patrón Result
- **[RF-02.1]** *CUANDO* se reciban datos desde la interfaz de usuario, lectores de códigos de barras, pesajes de balanza o inputs numéricos, *EL SISTEMA* ejecutará una validación pura que retorne un tipo formal discriminado `Result<T, ValidationError>`.
- **[RF-02.2]** *SI* un dato numérico contiene `NaN`, infinitos, precios menores a cero, o pesos menores o iguales a cero, *ENTONCES* *EL SISTEMA* rechazará la operación devolviendo un error descriptivo sin mutar el estado.
- **[RF-02.3]** *SI* un identificador o código de barras contiene cadenas vacías o compuestas únicamente por espacios en blanco, *ENTONCES* *EL SISTEMA* marcará la entrada como inválida en la frontera de entrada.

### 4.3. Resiliencia y Recuperación de Persistencia
- **[RF-03.1]** *EL SISTEMA* versionará los esquemas de datos guardados localmente mediante un identificador numérico de versión en cada payload persistido.
- **[RF-03.2]** *SI* al rehidratar el estado desde `localStorage` el contenido JSON está malformado o la validación del esquema falla, *ENTONCES* *EL SISTEMA*:
  1. Creará automáticamente una entrada de rescate en almacenamiento local bajo la clave `backup_corrupt_<dominio>_<timestamp>`.
  2. Inicializará el estado del módulo con sus valores seguros por defecto.
  3. Emitirá un reporte controlado de diagnóstico en consola sin lanzar excepciones no capturadas ni interrumpir la interfaz del POS.

### 4.4. Comunicación y Barreras entre Dominios
- **[RF-04.1]** *CUANDO* un dominio requiera interactuar con otro dominio, *EL SISTEMA* consumirá exclusivamente los artefactos expuestos en el archivo `src/features/<dominio>/index.ts` del destino.
- **[RF-04.2]** *SI* un archivo intenta importar un módulo interno de otra feature mediante una ruta profunda (ej. `from '@/features/inventory/components/...'`), *ENTONCES* *EL SISTEMA* considerará la importación como una violación arquitectónica.
- **[RF-04.3]** *EL SISTEMA* alojará las interfaces y entidades que sean consumidas por dos o más dominios (ej. `Product`, `Customer`, `User`, `Branch`) exclusivamente en `src/types/`.

---

## 5. Requisitos No Funcionales

- **[RNF-01] Alta Cohesión y Bajo Acoplamiento:** Los módulos de negocio en `domain/` deben ser deterministas y ejecutables en cualquier entorno TypeScript (Node.js, navegador o web worker) sin dependencias externas.
- **[RNF-02] Tipado Estricto:** Prohibición absoluta del tipo `any` en todo el repositorio. Las opciones de compilación deben forzar `noImplicitAny: true` y la regla `@typescript-eslint/no-explicit-any: error`.
- **[RNF-03] Minimal Stack (Zero Bloat):** Se prohíbe la inclusión de librerías de validación como Zod, Yup o Joi. Toda validación se resuelve mediante TypeScript estricto, type guards nativos y el patrón `Result`.
- **[RNF-04] Cobertura de Pruebas Unitarias:** El 100% de las líneas y ramas de decisión en `src/features/*/domain/` y funciones de cálculo en `src/lib/` deben estar cubiertas por pruebas unitarias automatizadas con Vitest.
- **[RNF-05] Convención de Idiomas:** Todos los identificadores, tipos, funciones y mensajes de commit se escriben en inglés técnico. Todo texto legible por el usuario final y la documentación residen en español (Argentina).

---

## 6. Casos Límite y Manejo de Errores

| Caso Límite | Comportamiento Requerido |
| :--- | :--- |
| **JSON truncado o corrupto en `localStorage`** | Captura de excepción en parseo, copia de respaldo preventiva con timestamp e inicialización del estado en fallback seguro. |
| **Lectura de balanza negativa o cero (`0.000 kg`)** | La función de validación de dominio rechaza la adición al carrito con error `INVALID_WEIGHT`. |
| **Descuentos o pagos que generen números negativos** | El cálculo de vuelto y saldo limita los valores numéricos a un piso inferior de 0 (`Math.max(0, valor)`). |
| **Importación circular entre dominios** | El árbol de dependencias estático debe ser estrictamente acíclico; los tipos compartidos se resuelven en `src/types/`. |
| **Intento de usar hooks de React dentro de `domain/`** | Falla inmediata en compilación / linting estático. |

---

## 7. Fuera de Alcance

- Creación de nuevas pantallas o flujos comerciales no contemplados en el prototipo actual.
- Modificaciones en la referencia visual o paleta de colores de Google Stitch.
- Alteraciones en el esquema relacional de base de datos de PostgreSQL (`src/db/schema.sql`).
- Implementación de adaptadores nativos para hardware físico serial (COM) o drivers de balanza/impresora (se mantendrán simulados/mockeados en esta fase).

---

## 8. Criterios de Finalización (Definition of Done)

Para dar por superada y aprobada la auditoría arquitectónica base, deben cumplirse las siguientes condiciones sin excepción:

1. **Estructura Modular Normalizada:** Todas las carpetas de `src/features/*` cuentan con sus submódulos `domain/`, `components/`, `hooks/` / `stores/` y su respectivo `index.ts`.
2. **Cero Cálculos en UI/Stores:** Toda función de cálculo de precios, redondeo, conversión de bultos y balance de caja reside exclusivamente en `src/features/<dominio>/domain/`.
3. **Cero Violaciones de Frontera:** Ningún archivo dentro de `domain/` importa componentes ni dependencias de React o Zustand.
4. **Cero Deep Imports:** Ninguna feature importa módulos internos de otra feature.
5. **Cobertura 100% en Lógica Pura:** La suite de pruebas de Vitest reporta 100% de cobertura en líneas y branches para el código de dominio y utilidades.
6. **Gate 100% Verde:** La ejecución de la siguiente secuencia finaliza con cero advertencias y cero errores:
   ```bash
   pnpm run typecheck && pnpm run lint && pnpm test
   ```
