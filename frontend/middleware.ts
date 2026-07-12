import { NextRequest } from "next/server";
import { proxy } from "./app/proxy";

export default function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/vehicles/:path*",
    "/drivers/:path*",
    "/trips/:path*",
    "/maintenance/:path*",
    "/expenses/:path*",
    "/reports/:path*",
  ],
};
