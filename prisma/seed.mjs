import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_PASSWORD || "admin1234";
  const seedRounds = Number(process.env.SEED_BCRYPT_ROUNDS) || 12;
  const password = bcrypt.hashSync(seedPassword, seedRounds);

  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("✅ 이미 시드 데이터가 존재합니다. 건너뜁니다.");
    return;
  }

  // ============ Users ============
  const superAdmin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: password,
      name: "최고관리자",
      phone: "010-0000-0001",
      role: UserRole.SUPER_ADMIN,
      department: "총괄",
      employeeCode: "EMP-0001",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@example.com",
      passwordHash: password,
      name: "김관리",
      phone: "010-0000-0002",
      role: UserRole.ADMIN,
      department: "경영지원",
      employeeCode: "EMP-0002",
    },
  });

  const sales = await prisma.user.create({
    data: {
      email: "sales@example.com",
      passwordHash: password,
      name: "이영업",
      phone: "010-0000-0003",
      role: UserRole.SALES,
      department: "영업팀",
      employeeCode: "EMP-0003",
    },
  });

  const operator = await prisma.user.create({
    data: {
      email: "op@example.com",
      passwordHash: password,
      name: "박운영",
      phone: "010-0000-0004",
      role: UserRole.OPERATOR,
      department: "운영팀",
      employeeCode: "EMP-0004",
    },
  });

  const driverUser1 = await prisma.user.create({
    data: {
      email: "driver1@globe.com",
      passwordHash: password,
      name: "최기사",
      phone: "010-1111-0001",
      role: UserRole.DRIVER,
      department: "운전팀",
      employeeCode: "EMP-1001",
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      email: "driver2@globe.com",
      passwordHash: password,
      name: "홍기사",
      phone: "010-1111-0002",
      role: UserRole.DRIVER,
      department: "운전팀",
      employeeCode: "EMP-1002",
    },
  });

  const guideUser = await prisma.user.create({
    data: {
      email: "guide1@globe.com",
      passwordHash: password,
      name: "이가이드",
      phone: "010-2222-0001",
      role: UserRole.GUIDE,
      department: "가이드팀",
      employeeCode: "EMP-2001",
    },
  });

  console.log("✅ 사용자 생성 완료 (비밀번호: SEED_PASSWORD 환경변수 또는 기본 admin1234 — 운영 시 반드시 변경)");

  // ============ Drivers / Guides ============
  const driver1 = await prisma.driver.create({
    data: {
      userId: driverUser1.id,
      licenseNumber: "11-11-111111-11",
      licenseType: "LARGE",
      licenseExpiry: new Date("2030-12-31"),
      availableRegion: "서울/경기",
      overtimeAllowed: true,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      userId: driverUser2.id,
      licenseNumber: "22-22-222222-22",
      licenseType: "LARGE_SPECIAL",
      licenseExpiry: new Date("2031-06-30"),
      availableRegion: "경기/인천",
      overtimeAllowed: false,
    },
  });

  const guide1 = await prisma.guide.create({
    data: {
      userId: guideUser.id,
      licenseNumber: "G-2024-0001",
      languages: JSON.stringify(["한국어", "중국어"]),
      specializations: JSON.stringify(["수학여행", "공장견학"]),
      availableRegion: "전국",
    },
  });

  console.log("✅ 기사/가이드 프로필 생성 완료");

  // ============ Clients ============
  const clientPublic = await prisma.client.create({
    data: {
      clientType: "PUBLIC",
      officialName: "경기도교육청",
      documentName: "경기도교육청",
      bizNumber: "123-45-67890",
      ceoName: "교육감",
      contactName: "이 담당관",
      contactPhone: "031-0000-1111",
      contactEmail: "edu@gg.go.kr",
      address: "경기도 수원시 팔달구",
      organizationType: "지자체",
      status: "ACTIVE",
    },
  });

  const clientSchool = await prisma.client.create({
    data: {
      clientType: "SCHOOL",
      officialName: "서울시립대학교",
      documentName: "서울시립대학교 총무과",
      bizNumber: "101-82-00001",
      ceoName: "총장",
      contactName: "박 행정원",
      contactPhone: "02-0000-2222",
      address: "서울특별시 동대문구",
      status: "ACTIVE",
    },
  });

  const clientCorp = await prisma.client.create({
    data: {
      clientType: "CORPORATION",
      officialName: "한국관광산업(주)",
      documentName: "한국관광산업(주)",
      bizNumber: "220-88-12345",
      ceoName: "한대표",
      contactName: "김 과장",
      contactPhone: "02-3333-4444",
      contactEmail: "biz@koreatour.co.kr",
      address: "서울특별시 마포구",
      salesManagerId: sales.id,
      status: "ACTIVE",
    },
  });

  const clientInd = await prisma.client.create({
    data: {
      clientType: "INDIVIDUAL",
      personalName: "김철수",
      contactName: "김철수",
      contactPhone: "010-5555-6666",
      salesManagerId: sales.id,
      status: "ACTIVE",
    },
  });

  console.log("✅ 고객(거래처) 생성 완료");

  // ============ Products ============
  const p1 = await prisma.travelProduct.create({
    data: {
      productType: "COMMUTE_BUS",
      productName: "경기도교육청 출퇴근 셔틀",
      productCode: "P-2001",
      basePrice: 1800000,
      duration: 4,
      minParticipants: 20,
      maxParticipants: 45,
      region: "경기",
      status: "ACTIVE",
    },
  });

  const p2 = await prisma.travelProduct.create({
    data: {
      productType: "PACKAGE_TOUR",
      productName: "경주 역사문화 탐방 1박2일",
      productCode: "P-1001",
      basePrice: 3500000,
      duration: 24,
      minParticipants: 30,
      maxParticipants: 45,
      region: "경주",
      status: "ACTIVE",
    },
  });

  const p3 = await prisma.travelProduct.create({
    data: {
      productType: "GROUP_TOUR",
      productName: "설악산 단체관광 당일",
      productCode: "P-3001",
      basePrice: 2200000,
      duration: 12,
      minParticipants: 20,
      maxParticipants: 45,
      region: "강원",
      status: "ACTIVE",
    },
  });

  const p4 = await prisma.travelProduct.create({
    data: {
      productType: "CHARTER_BUS",
      productName: "기업 워크숍 전세버스",
      productCode: "P-4001",
      basePrice: 1500000,
      duration: 10,
      minParticipants: 10,
      maxParticipants: 45,
      region: "전국",
      status: "ACTIVE",
    },
  });

  console.log("✅ 여행상품 생성 완료");

  // ============ Vehicles ============
  const v1 = await prisma.vehicle.create({
    data: {
      vehicleType: "LARGE_BUS",
      plateNumber: "경기12가3456",
      seats: 45,
      ownership: "OWN",
      maxDailyHours: 10,
      status: "ACTIVE",
    },
  });

  const v2 = await prisma.vehicle.create({
    data: {
      vehicleType: "MIDBUS",
      plateNumber: "서울77나1234",
      seats: 25,
      ownership: "OWN",
      maxDailyHours: 10,
      status: "ACTIVE",
    },
  });

  const v3 = await prisma.vehicle.create({
    data: {
      vehicleType: "LARGE_BUS",
      plateNumber: "인천12다5678",
      seats: 45,
      ownership: "EXTERNAL",
      externalCompany: "미래관광버스(주)",
      externalCost: 450000,
      maxDailyHours: 10,
      status: "ACTIVE",
    },
  });

  const v4 = await prisma.vehicle.create({
    data: {
      vehicleType: "MINIBUS",
      plateNumber: "경북98라1111",
      seats: 15,
      ownership: "OWN",
      maxDailyHours: 10,
      status: "ACTIVE",
    },
  });

  console.log("✅ 차량 생성 완료");

  // ============ Dispatch Rules ============
  await prisma.dispatchRule.createMany({
    data: [
      {
        ruleType: "REST_HOURS",
        name: "법정 휴식시간",
        description: "운행 종료 후 11시간 이상 휴식 보장 (여객자동차운수사업법)",
        conditions: JSON.stringify({ minRestHours: 11 }),
        weight: 20,
        isActive: true,
      },
      {
        ruleType: "MAX_DAILY_HOURS",
        name: "일일 최대 근무시간",
        description: "1일 최대 16시간 초과 금지",
        conditions: JSON.stringify({ maxHours: 10 }),
        weight: 15,
        isActive: true,
      },
      {
        ruleType: "CONSECUTIVE_DAYS",
        name: "연속 근무일수",
        description: "연속 근무 7일 초과 시 휴일 필요",
        conditions: JSON.stringify({ maxDays: 7 }),
        weight: 10,
        isActive: true,
      },
      {
        ruleType: "REGION_MATCH",
        name: "지역 매칭",
        description: "기사 활동 지역과 운행 지역 일치",
        conditions: JSON.stringify({ match: true }),
        weight: 15,
        isActive: true,
      },
      {
        ruleType: "PREFERENCE",
        name: "기사 선호도",
        description: "기사 평점 기반 선호도 가산점",
        conditions: JSON.stringify({ weight: 1 }),
        weight: 10,
        isActive: true,
      },
    ],
  });

  console.log("✅ 배차 규칙 생성 완료");

  // ============ Contracts / Schedules / Dispatches ============
  const today = new Date();
  const startDt = new Date(today);
  startDt.setDate(startDt.getDate() + 2);

  const c1 = await prisma.contract.create({
    data: {
      contractNumber: "C-2026-0001",
      productId: p1.id,
      clientId: clientPublic.id,
      contractDate: new Date(),
      startDate: startDt,
      endDate: new Date(startDt.getTime() + 30 * 86400000),
      totalAmount: 36000000,
      depositAmount: 18000000,
      depositPaid: 18000000,
      items: JSON.stringify([
        { name: "출퇴근 셔틀 6월분", amount: 18000000 },
        { name: "출퇴근 셔틀 7월분", amount: 18000000 },
      ]),
      quotedBy: sales.id,
      approvedBy: manager.id,
      status: "ACTIVE",
    },
  });

  const s1 = await prisma.schedule.create({
    data: {
      productId: p1.id,
      contractId: c1.id,
      clientId: clientPublic.id,
      startDate: startDt,
      endDate: startDt,
      totalDays: 1,
      startTime: "07:30",
      endTime: "18:30",
      departureLocation: "경기도의회",
      arrivalLocation: "경기도 교육연수원",
      participants: 40,
      adultCount: 40,
      status: "CONFIRMED",
    },
  });

  const future = new Date(startDt);
  future.setDate(future.getDate() + 3);
  const s2 = await prisma.schedule.create({
    data: {
      productId: p2.id,
      clientId: clientSchool.id,
      startDate: future,
      endDate: new Date(future.getTime() + 86400000),
      totalDays: 2,
      startTime: "08:00",
      endTime: "19:00",
      departureLocation: "서울시립대학교",
      arrivalLocation: "경주",
      participants: 40,
      adultCount: 38,
      childCount: 2,
      status: "PLANNED",
    },
  });

  await prisma.dispatch.create({
    data: {
      scheduleId: s1.id,
      vehicleId: v1.id,
      driverId: driver1.id,
      guideId: guide1.id,
      scheduledStart: new Date(startDt.setHours(7, 30, 0, 0)),
      scheduledEnd: new Date(startDt.setHours(18, 30, 0, 0)),
      departureLocation: "경기도의회",
      arrivalLocation: "경기도 교육연수원",
      status: "CONFIRMED",
      recommendationScore: 82,
    },
  });

  await prisma.dispatch.create({
    data: {
      scheduleId: s2.id,
      vehicleId: v2.id,
      driverId: driver2.id,
      scheduledStart: new Date(future.setHours(8, 0, 0, 0)),
      scheduledEnd: new Date(future.getTime() + 86400000),
      departureLocation: "서울시립대학교",
      arrivalLocation: "경주",
      status: "PENDING",
      autoRecommended: true,
      recommendationScore: 75,
      warnings: JSON.stringify(["연속 근무 임박"]),
    },
  });

  console.log("✅ 계약/일정/배차 생성 완료");

  // ============ Stats Cache ============
  await prisma.statsCache.create({
    data: {
      cacheKey: "dashboard:overview",
      cacheType: "dashboard_overview",
      data: "{}",
      dataCount: 0,
      validUntil: new Date(Date.now() + 3600000),
    },
  });

  console.log("🎉 시드 데이터 생성이 완료되었습니다.");
  console.log("로그인: admin@example.com / (SEED_PASSWORD 또는 admin1234, 최고관리자)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });