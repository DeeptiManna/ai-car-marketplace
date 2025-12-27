"use server";

import { serializeCarData } from "@/lib/helpers";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

/**
 * Check if current user is admin
 */
export async function getAdmin() {
  noStore(); // ⬅️ CRITICAL: prevents static analysis

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user || user.role !== "ADMIN") {
    return { authorized: false, reason: "not-admin" };
  }

  return { authorized: true, user };
}

/**
 * Get all test drives for admin with filters
 */
export async function getAdminTestDrives({ search = "", status = "" }) {
  noStore(); // ⬅️ prevents static analysis

  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized access");
    }

    let where = {};

    if (status) where.status = status;

    if (search) {
      where.OR = [
        {
          car: {
            OR: [
              { make: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const bookings = await db.testDriveBooking.findMany({
      where,
      include: {
        car: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            phone: true,
          },
        },
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
    });

    return {
      success: true,
      data: bookings.map((booking) => ({
        id: booking.id,
        carId: booking.carId,
        car: serializeCarData(booking.car),
        userId: booking.userId,
        user: booking.user,
        bookingDate: booking.bookingDate.toISOString(),
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching test drives:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update test drive status
 */
export async function updateTestDriveStatus(bookingId, newStatus) {
  noStore(); // ⬅️ prevents static analysis

  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      throw new Error("Unauthorized access");
    }

    const booking = await db.testDriveBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new Error("Booking not found");

    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];

    if (!validStatuses.includes(newStatus)) {
      return { success: false, error: "Invalid status" };
    }

    await db.testDriveBooking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    revalidatePath("/admin/test-drives");
    revalidatePath("/reservations");

    return {
      success: true,
      message: "Test drive status updated successfully",
    };
  } catch (error) {
    throw new Error("Error updating test drive status: " + error.message);
  }
}

/**
 * Admin dashboard data
 */
export async function getDashboardData() {
  noStore(); // ⬅️ MOST IMPORTANT FOR YOUR ERROR

  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const [cars, testDrives] = await Promise.all([
      db.car.findMany({
        select: { id: true, status: true, featured: true },
      }),
      db.testDriveBooking.findMany({
        select: { id: true, status: true, carId: true },
      }),
    ]);

    const completedTestDriveCarIds = testDrives
      .filter((td) => td.status === "COMPLETED")
      .map((td) => td.carId);

    const soldCarsAfterTestDrive = cars.filter(
      (car) =>
        car.status === "SOLD" &&
        completedTestDriveCarIds.includes(car.id)
    ).length;

    const completed = testDrives.filter(
      (td) => td.status === "COMPLETED"
    ).length;

    const conversionRate =
      completed > 0
        ? (soldCarsAfterTestDrive / completed) * 100
        : 0;

    return {
      success: true,
      data: {
        cars: {
          total: cars.length,
          available: cars.filter((c) => c.status === "AVAILABLE").length,
          sold: cars.filter((c) => c.status === "SOLD").length,
          unavailable: cars.filter((c) => c.status === "UNAVAILABLE").length,
          featured: cars.filter((c) => c.featured).length,
        },
        testDrives: {
          total: testDrives.length,
          pending: testDrives.filter((td) => td.status === "PENDING").length,
          confirmed: testDrives.filter((td) => td.status === "CONFIRMED").length,
          completed,
          cancelled: testDrives.filter((td) => td.status === "CANCELLED").length,
          noShow: testDrives.filter((td) => td.status === "NO_SHOW").length,
          conversionRate: Number(conversionRate.toFixed(2)),
        },
      },
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error.message);
    return { success: false, error: error.message };
  }
}
