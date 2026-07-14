import asyncio
from sqlalchemy import text
from app.core.db import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))

if __name__ == "__main__":
    asyncio.run(main())
