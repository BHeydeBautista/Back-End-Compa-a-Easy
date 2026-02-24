import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Course } from '../src/users/entities/course.entity';

type SeedCourse = {
  code: string;
  name: string;
};

const COURSES: SeedCourse[] = [
  { code: 'C.B.I', name: 'CURSO BASICO DE INFANTERIA' },
  { code: 'C.A.I', name: 'CURSO AVANZADO DE INFANTERÍA' },
  { code: 'C.O.S', name: 'CURSO DE ORIENTACION Y SUPERVIVENCIA' },
  { code: 'C.L', name: 'CURSO DE LIDERAZGO' },
  { code: 'C.R.L', name: 'CURSO DE RADIO LARGA' },
  { code: 'C.M.C', name: 'CURSO DE MEDICO DE COMBATE' },
  { code: 'C.A.C', name: 'CURSO DE AMETRALLADOR DE COMBATE' },
  { code: 'C.P.C', name: 'CURSO DE PARACAIDISTA DE COMBATE' },
  { code: 'C.C.E', name: 'CURSO DE CONDUCTOR ESPECIALIZADO' },
  { code: 'C.A.T', name: 'CURSO DE ANTITANQUE Y ANTIAEREO' },
  { code: 'C.I.C', name: 'CURSO DE INGENIERO DE COMBATE' },
  { code: 'C.E.E', name: 'CURSO DE EXPERTO EN EXPLOSIVOS' },
  { code: 'C.O.U', name: 'CURSO DE OPERACIONES URBANAS' },
  { code: 'C.T.S', name: 'CURSO DE TIRADOR SELECTO (SHARPSHOTER)' },
  { code: 'C.A.P', name: 'CURSO DE AMETRALLADOR PESADO' },
  { code: 'C.G.C', name: 'CURSO DE GRANADERO DE COMBATE' },
  { code: 'C.T.D', name: 'CURSO DE TIRADOR DESIGNADO' },
  { code: 'C.O.B', name: 'CURSO BÁSICO DE OBSERVADOR' },
  { code: 'C.O.A', name: 'CURSO OBSERVADOR AVANZADO' },
  { code: 'C.F.E.C', name: 'CURSO FUERZA ESPECIAL CERBERUS' },
  { code: 'C.R.A', name: 'CURSO DE AVANCE Y REPLIEGUE' },
  { code: 'C.M.O', name: 'CURSO DE MORTERISTA' },
  { code: 'C.A.T.P', name: 'CURSO DE ANTITANQUE Y ANTIAEREO PESADO' },
  { code: 'C.R.R', name: 'CURSO DE RESCATE DE REHENES' },
  { code: 'C.L.T', name: 'CURSO DE LIDERAZGO TACTICO' },
  { code: 'C.L.E', name: 'CURSO DE LIDERAZGO ESTRATEGICO' },
  { code: 'C.L.E.II', name: 'CURSO DE LIDERAZGO ESTRATEGICO 2' },
  { code: 'C.L.C', name: 'CURSO DE LIDERAZGO CONJUNTO' },
  { code: 'C.F.T', name: 'CURSO DE FRANCOTIRADOR' },
  // NOTE: En tu lista el nombre largo para C.O.P estaba vacío. Dejo placeholder.
  { code: 'C.O.P', name: 'PENDIENTE (definir nombre largo)' },
  { code: 'C.A.E', name: 'CURSO DE ASALTO AÉREO' },
  // NOTE: En tu lista el nombre largo para C.E.R estaba vacío. Dejo placeholder.
  { code: 'C.E.R', name: 'PENDIENTE (definir nombre largo)' },
  // NOTE: En tu lista el nombre largo para C.O.E estaba vacío. Dejo placeholder.
  { code: 'C.O.E', name: 'PENDIENTE (definir nombre largo)' },
  // NOTE: En tu lista el nombre largo para C.O.H estaba vacío. Dejo placeholder.
  { code: 'C.O.H', name: 'PENDIENTE (definir nombre largo)' },
  { code: 'C.O.M', name: 'CURSO DE OPERACIONES MARITIMAS' },
  { code: 'C.A.R', name: 'CURSO DE ALA ROTATIVA' },
  { code: 'C.A.F', name: 'CURSO DE ALA FIJA' },
  { code: 'C.A.A', name: 'CURSO DE APOYO AEREO' },
  { code: 'C.P.D', name: 'CURSO DE PILOTO DE DRONES' },
  { code: 'C.V.P', name: 'CURSO DE VEHICULO PESADOS' },
  { code: 'C.V.C', name: 'CURSO DE VEHICULO DE COMBATE' },
];

function normalizeCode(code: string) {
  return String(code ?? '').trim();
}

function normalizeName(name: string) {
  return String(name ?? '').trim();
}

async function seedCourses(courseRepository: Repository<Course>) {
  let created = 0;
  let updated = 0;

  for (const c of COURSES) {
    const code = normalizeCode(c.code);
    const name = normalizeName(c.name);

    if (!code || !name) {
      Logger.warn(`Skip: invalid course entry code="${code}" name="${name}"`, 'SeedCourses');
      continue;
    }

    const existing = await courseRepository.findOne({ where: { code } });
    if (!existing) {
      await courseRepository.save({
        code,
        name,
        description: null,
        type: null,
        requiresAllPreviousAscenso: false,
      });
      created++;
      continue;
    }

    const needsUpdate = (existing.name ?? '').trim() !== name;
    if (needsUpdate) {
      await courseRepository.update({ id: existing.id }, { name });
      updated++;
    }
  }

  return { created, updated };
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const repo = app.get<Repository<Course>>(getRepositoryToken(Course));
    const result = await seedCourses(repo);
    Logger.log(`Done. created=${result.created} updated=${result.updated}`, 'SeedCourses');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
