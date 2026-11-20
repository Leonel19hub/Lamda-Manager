---
name: sdd
description: Úsala siempre que trabajes con Spec-Driven Development en este proyecto (docs/constitution.md o cualquier archivo dentro de specs/): redactar, revisar o cambiar specs, planes técnicos y tareas, o implementar y validar tareas de una spec.
---

# Spec-Driven Development (SDD) — Lambda Manager

## Flujo Innegociable
Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio de Requisitos.

### Reglas Maestras
1. **La spec manda:** Si una funcionalidad o comportamiento no está en la spec activa, no se implementa. Si falta una decisión o hay ambigüedad, DETÉN la ejecución y consulta al usuario.
2. **Aprobación obligatoria:** Nunca pases a la siguiente fase sin la aprobación explícita del usuario.
3. **Core Isolation:** Toda regla de cálculo o negocio debe residir en funciones puras en `src/features/<dominio>/domain/` (cero dependencias de React, Zustand o DOM).
4. **Zero-Defect Gate:** No se avanza con tests en rojo ni errores de tipos (`pnpm run typecheck && pnpm test` siempre en verde).
5. **Memoria viva:** Al cerrar cada fase o conjunto de tareas, actualiza `MEMORY.md` (manteniéndolo en un máximo de ~50 líneas).

---

## Fases del Flujo

### 1. Especificación (`spec.md`)
- **Objetivo:** Describir únicamente el QUÉ y el POR QUÉ. Prohibido incluir código, nombres de archivos, librerías o arquitectura técnica.
- **Entrevista previa:** Haz de 3 a 5 preguntas de UNA EN UNA para despejar casos límite, errores y lo que queda fuera de alcance.
- **Sintaxis obligatoria:** Redacta los Requisitos Funcionales (RF) en notación **EARS** en español:
  - *Ubícuo:* `EL SISTEMA <hará X>`
  - *Basado en eventos:* `CUANDO <evento>, EL SISTEMA <hará X>`
  - *Basado en estados:* `MIENTRAS <estado>, EL SISTEMA <hará X>`
  - *Condicional:* `SI <condición>, ENTONCES EL SISTEMA <hará X>`
- Guarda en `specs/NNN-nombre/spec.md` con `Estado: Borrador`.

### 2. Clarificación (Revisión de QA)
- Adopta el rol de QA riguroso. Revisa `spec.md` buscando:
  1. Ambigüedades y requisitos no verificables.
  2. Contradicciones internas.
  3. Casos límite no cubiertos.
  4. Conflictos con `docs/constitution.md`.
- Solo detecta problemas en lista numerada, sin proponer soluciones técnicas. Espera aprobación.

### 3. Plan Técnico (`plan.md`)
- Define el CÓMO a partir de la spec aprobada.
- Mapea las funciones puras en `domain/` con sus firmas TypeScript y contratos `Result<T, E>`.
- Diseña la estrategia de tests unitarios (casos nominales, bordes, redondeos a $10 y decimales).
- Identifica archivos a tocar y dependencias. Prohibido agregar dependencias externas sin justificación crítica.

### 4. Desglose de Tareas (`tasks.md`)
- Divide el plan en tareas atómicas de 20 a 30 minutos organizadas en orden estricto de dependencias:
  ```markdown
  - [ ] **[T-XX] <Título claro>**
    - **Archivos a crear/modificar:** <rutas>
    - **Descripción:** <resumen del cambio y RF que cubre>
    - **Hecho cuando:** <comprobación verificable: test pasando / typecheck limpio>
  ```
- Si surgen más de 10–12 tareas, propón dividir la funcionalidad en dos specs.

### 5. Implementación (TDD)
- Trabaja **una sola tarea por vez**.
- Escribe primero los tests en `*.test.ts` (en rojo), luego implementa la función hasta dejar la suite en verde.
- Ejecuta `pnpm run typecheck && pnpm test`.
- Marca la tarea con `[x]` en `tasks.md` y DETENTE. No saltes a la siguiente sin verificación.

### 6. Validación
- Audita la implementación completa contrastando cada Requisito Funcional (RF-x) frente a los tests y el comportamiento real.

### 7. Cambios de Requisitos
- Si el usuario pide un cambio sobre una funcionalidad ya desarrollada:
  1. Modifica primero `spec.md` (añadiendo o ajustando el RF en EARS).
  2. Muestra el diff y espera aprobación.
  3. Actualiza `plan.md` y `tasks.md`.
  4. Recién ahí modifica el código.
