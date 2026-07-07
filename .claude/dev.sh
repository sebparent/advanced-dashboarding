#!/bin/bash
# Use the Homebrew-upgraded Node (>=20.9) instead of the old system Node.
export PATH="/opt/homebrew/bin:$PATH"
exec npm run dev
