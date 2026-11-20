# Engineering Constitution — Lambda Manager

1. **Spec First:** Ninguna línea de código de producción se escribe sin una especificación activa aprobada; ante cualquier ambigüedad o decisión ausente, se pausa la implementación y se consulta.
2. **Minimal Stack & Zero Bloat:** Se prohíbe la sobreingeniería y la incorporación de dependencias externas sin justificación crítica, priorizando primitivas estándar del stack base (React 19, TS estricto, Tailwind).
3. **Core Isolation:** Las reglas de negocio y cálculos de dominio deben residir exclusivamente en funciones puras y tipadas, desacopladas de componentes React, efectos de UI y capas de persistencia.
4. **Zero-Defect Gate:** Toda suite de pruebas debe ejecutarse al 100% en verde antes de dar por cerrada cualquier tarea; queda estrictamente prohibido avanzar sobre tests rotos o salteados.
5. **Data Inviolability:** Todo cambio en la persistencia o esquema debe ser retrocompatible y garantizar tolerancia a fallos, previniendo la pérdida o corrupción de datos transaccionales del usuario.
6. **Bilingual Boundary:** El código fuente (identificadores, tipos, interfaces) y mensajes de commit se escriben estrictamente en inglés, mientras que la interfaz de usuario (español de Argentina) y la documentación residen en español.
