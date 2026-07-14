import asyncio
from sqlalchemy import text
from app.core.db import engine

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'trips'"))
        for row in res:
            print(row)

if __name__ == "__main__":
    asyncio.run(main())
